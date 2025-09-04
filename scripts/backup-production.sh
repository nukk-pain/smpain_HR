#!/bin/bash

# 📦 Production Backup Script
# Description: Backup production database and critical files
# Usage: ./backup-production.sh [--full] [--db-only] [--files-only]
# Author: HR System Team
# Date: 2025-09-04

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "backend/.env.production" ]; then
    export $(cat backend/.env.production | grep -v '^#' | xargs)
elif [ -f "backend/.env" ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="backups"
BACKUP_DIR="$BACKUP_ROOT/backup_$TIMESTAMP"
MAX_BACKUPS=10  # Keep only last 10 backups

# Parse arguments
BACKUP_MODE="full"
if [ "$1" == "--db-only" ]; then
    BACKUP_MODE="db"
elif [ "$1" == "--files-only" ]; then
    BACKUP_MODE="files"
fi

echo -e "${BLUE}📦 Starting production backup...${NC}"
echo -e "${YELLOW}Mode: $BACKUP_MODE${NC}"
echo -e "${YELLOW}Timestamp: $TIMESTAMP${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup MongoDB
backup_mongodb() {
    echo -e "\n${GREEN}🗄️  Step 1: Backing up MongoDB database...${NC}"
    
    # Check if mongodump is available
    if ! command -v mongodump &> /dev/null; then
        echo -e "${RED}❌ mongodump not found. Please install MongoDB tools.${NC}"
        return 1
    fi
    
    # Determine MongoDB URI
    if [ -n "$MONGODB_URI" ]; then
        echo "Using production MongoDB URI"
        MONGO_CONNECTION="$MONGODB_URI"
    else
        echo -e "${YELLOW}⚠️  No production URI found, using local MongoDB${NC}"
        MONGO_CONNECTION="mongodb://localhost:27017/SM_nomu"
    fi
    
    # Create database backup
    echo "Backing up database..."
    mongodump --uri="$MONGO_CONNECTION" --out="$BACKUP_DIR/mongodb" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  MongoDB backup with URI failed, trying local connection${NC}"
        mongodump --db SM_nomu --out="$BACKUP_DIR/mongodb" 2>/dev/null || {
            echo -e "${RED}❌ MongoDB backup failed${NC}"
            return 1
        }
    }
    
    # Get backup size
    DB_SIZE=$(du -sh "$BACKUP_DIR/mongodb" 2>/dev/null | cut -f1)
    echo -e "${GREEN}✅ Database backed up successfully (Size: $DB_SIZE)${NC}"
    
    # Create metadata file
    cat > "$BACKUP_DIR/mongodb/metadata.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "database": "SM_nomu",
    "collections": [
        "users",
        "departments",
        "leave_requests",
        "leave_balances",
        "payroll",
        "dailyWorkers",
        "sales"
    ],
    "backup_size": "$DB_SIZE"
}
EOF
}

# Function to backup critical files
backup_files() {
    echo -e "\n${GREEN}📁 Step 2: Backing up critical files...${NC}"
    
    # Create directories
    mkdir -p "$BACKUP_DIR/config"
    mkdir -p "$BACKUP_DIR/uploads"
    mkdir -p "$BACKUP_DIR/env"
    
    # Backup configuration files (with sensitive data redacted)
    echo "Backing up configuration files..."
    
    # Backend config
    if [ -d "backend/config" ]; then
        cp -r backend/config "$BACKUP_DIR/config/backend" 2>/dev/null || echo "No backend config"
    fi
    
    # Frontend config
    if [ -d "frontend/src/config" ]; then
        cp -r frontend/src/config "$BACKUP_DIR/config/frontend" 2>/dev/null || echo "No frontend config"
    fi
    
    # Environment files (redacted)
    echo "Backing up environment files (sensitive data redacted)..."
    for env_file in backend/.env backend/.env.production frontend/.env frontend/.env.production; do
        if [ -f "$env_file" ]; then
            FILENAME=$(basename "$env_file")
            cp "$env_file" "$BACKUP_DIR/env/$FILENAME.backup"
            # Redact sensitive information
            sed -i 's/JWT_SECRET=.*/JWT_SECRET=REDACTED/' "$BACKUP_DIR/env/$FILENAME.backup" 2>/dev/null || true
            sed -i 's/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=REDACTED/' "$BACKUP_DIR/env/$FILENAME.backup" 2>/dev/null || true
            sed -i 's/password=.*/password=REDACTED/g' "$BACKUP_DIR/env/$FILENAME.backup" 2>/dev/null || true
            sed -i 's/MONGODB_URI=.*@/MONGODB_URI=mongodb+srv:\/\/REDACTED@/' "$BACKUP_DIR/env/$FILENAME.backup" 2>/dev/null || true
        fi
    done
    
    # Backup uploaded files (if exists and not too large)
    if [ -d "backend/uploads" ]; then
        UPLOAD_SIZE=$(du -sm backend/uploads 2>/dev/null | cut -f1)
        if [ "$UPLOAD_SIZE" -lt 100 ]; then  # Only if less than 100MB
            echo "Backing up uploaded files..."
            cp -r backend/uploads "$BACKUP_DIR/uploads" 2>/dev/null || echo "No uploads to backup"
        else
            echo -e "${YELLOW}⚠️  Uploads directory too large ($UPLOAD_SIZE MB), skipping${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Files backed up successfully${NC}"
}

# Function to create backup manifest
create_manifest() {
    echo -e "\n${GREEN}📋 Step 3: Creating backup manifest...${NC}"
    
    cat > "$BACKUP_DIR/manifest.json" << EOF
{
    "backup_id": "backup_$TIMESTAMP",
    "created_at": "$(date -Iseconds)",
    "backup_mode": "$BACKUP_MODE",
    "git_info": {
        "branch": "$(git branch --show-current)",
        "commit": "$(git rev-parse HEAD)",
        "tag": "$(git describe --tags --abbrev=0 2>/dev/null || echo 'no-tag')"
    },
    "system_info": {
        "user": "$(whoami)",
        "hostname": "$(hostname)",
        "platform": "$(uname -s)",
        "node_version": "$(node --version 2>/dev/null || echo 'not-installed')"
    },
    "components": {
        "database": $([ "$BACKUP_MODE" != "files" ] && echo "true" || echo "false"),
        "config_files": $([ "$BACKUP_MODE" != "db" ] && echo "true" || echo "false"),
        "uploads": $([ "$BACKUP_MODE" != "db" ] && [ -d "$BACKUP_DIR/uploads" ] && echo "true" || echo "false")
    }
}
EOF
    
    echo -e "${GREEN}✅ Manifest created${NC}"
}

# Function to compress backup
compress_backup() {
    echo -e "\n${GREEN}🗜️  Step 4: Compressing backup...${NC}"
    
    cd "$BACKUP_ROOT"
    tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
    
    # Get compressed size
    COMPRESSED_SIZE=$(du -sh "backup_$TIMESTAMP.tar.gz" | cut -f1)
    echo -e "${GREEN}✅ Backup compressed (Size: $COMPRESSED_SIZE)${NC}"
    
    # Remove uncompressed backup
    rm -rf "backup_$TIMESTAMP"
    cd ..
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo -e "\n${GREEN}🧹 Step 5: Cleaning up old backups...${NC}"
    
    # Count existing backups
    BACKUP_COUNT=$(ls -1 $BACKUP_ROOT/backup_*.tar.gz 2>/dev/null | wc -l)
    
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        # Calculate how many to delete
        DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
        echo "Found $BACKUP_COUNT backups, removing $DELETE_COUNT oldest"
        
        # Delete oldest backups
        ls -1t $BACKUP_ROOT/backup_*.tar.gz | tail -n $DELETE_COUNT | xargs rm -f
        echo -e "${GREEN}✅ Cleaned up $DELETE_COUNT old backups${NC}"
    else
        echo "Current backups: $BACKUP_COUNT (max: $MAX_BACKUPS)"
    fi
}

# Function to verify backup
verify_backup() {
    echo -e "\n${GREEN}🔍 Step 6: Verifying backup...${NC}"
    
    BACKUP_FILE="$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz"
    
    if [ -f "$BACKUP_FILE" ]; then
        # Test archive integrity
        tar -tzf "$BACKUP_FILE" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Backup verified successfully${NC}"
            echo -e "${BLUE}Backup location: $BACKUP_FILE${NC}"
            
            # Show backup contents summary
            echo -e "\n${YELLOW}Backup contents:${NC}"
            tar -tzf "$BACKUP_FILE" | head -20
            echo "..."
            
            return 0
        else
            echo -e "${RED}❌ Backup verification failed - archive corrupted${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Backup file not found${NC}"
        return 1
    fi
}

# Main backup process
main() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}    Production Backup Script v1.0${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    # Execute backup based on mode
    case "$BACKUP_MODE" in
        "db")
            backup_mongodb || exit 1
            ;;
        "files")
            backup_files || exit 1
            ;;
        "full")
            backup_mongodb || exit 1
            backup_files || exit 1
            ;;
    esac
    
    # Common steps
    create_manifest
    compress_backup
    cleanup_old_backups
    verify_backup
    
    # Success message
    echo -e "\n${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Backup saved as: $BACKUP_ROOT/backup_$TIMESTAMP.tar.gz${NC}"
    
    # Optional: Upload to cloud storage (uncomment and configure as needed)
    # echo -e "\n${BLUE}☁️  Uploading to cloud storage...${NC}"
    # gsutil cp "$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz" gs://your-backup-bucket/
    # echo -e "${GREEN}✅ Backup uploaded to cloud storage${NC}"
}

# Run main function
main