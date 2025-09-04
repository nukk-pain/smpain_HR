#!/bin/bash

# 🔄 Deployment Rollback Script
# Description: Rollback deployment to previous version
# Usage: ./rollback-deploy.sh [--dry-run]
# Author: HR System Team
# Date: 2025-09-04

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="smpain-hr"
GCP_PROJECT_ID="hr-backend-project"
GCP_SERVICE_NAME="hr-backend"
GCP_REGION="asia-northeast3"

# Parse arguments
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 DRY RUN MODE - No actual changes will be made${NC}"
fi

echo -e "${YELLOW}🔄 Starting rollback process...${NC}"

# Function to execute commands (respects dry-run mode)
execute_cmd() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would execute: $1${NC}"
    else
        echo -e "${GREEN}Executing: $1${NC}"
        eval "$1"
    fi
}

# 1. Get current git tag and previous tag
echo -e "\n${GREEN}📌 Step 1: Checking git tags...${NC}"
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "no-tag")
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "no-previous-tag")

echo "Current tag: $CURRENT_TAG"
echo "Previous tag: $PREVIOUS_TAG"

if [ "$PREVIOUS_TAG" == "no-previous-tag" ]; then
    echo -e "${RED}❌ No previous tag found. Cannot rollback.${NC}"
    exit 1
fi

# 2. Confirm rollback
if [ "$DRY_RUN" = false ]; then
    echo -e "\n${YELLOW}⚠️  WARNING: This will rollback from $CURRENT_TAG to $PREVIOUS_TAG${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${RED}❌ Rollback cancelled by user${NC}"
        exit 1
    fi
fi

# 3. Create backup of current state
echo -e "\n${GREEN}📦 Step 2: Creating backup of current state...${NC}"
BACKUP_DIR="backups/rollback_$(date +%Y%m%d_%H%M%S)"
execute_cmd "mkdir -p $BACKUP_DIR"
execute_cmd "git rev-parse HEAD > $BACKUP_DIR/current_commit.txt"
execute_cmd "echo '$CURRENT_TAG' > $BACKUP_DIR/current_tag.txt"

# 4. Rollback Git repository
echo -e "\n${GREEN}🔙 Step 3: Rolling back Git repository...${NC}"
execute_cmd "git checkout $PREVIOUS_TAG"

# 5. Rollback Google Cloud Run (if configured)
if command -v gcloud &> /dev/null; then
    echo -e "\n${GREEN}☁️  Step 4: Rolling back Google Cloud Run service...${NC}"
    
    # Get previous revision
    if [ "$DRY_RUN" = false ]; then
        PREVIOUS_REVISION=$(gcloud run revisions list \
            --service=$GCP_SERVICE_NAME \
            --region=$GCP_REGION \
            --format="value(name)" \
            --limit=2 | tail -n 1)
    else
        PREVIOUS_REVISION="previous-revision-example"
    fi
    
    if [ -n "$PREVIOUS_REVISION" ]; then
        execute_cmd "gcloud run services update-traffic $GCP_SERVICE_NAME \
            --region=$GCP_REGION \
            --to-revisions=$PREVIOUS_REVISION=100"
    else
        echo -e "${YELLOW}⚠️  No previous Cloud Run revision found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Google Cloud SDK not installed - skipping Cloud Run rollback${NC}"
fi

# 6. Rollback Vercel deployment
if command -v vercel &> /dev/null; then
    echo -e "\n${GREEN}🔙 Step 5: Rolling back Vercel deployment...${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        cd frontend
        execute_cmd "vercel rollback --yes"
        cd ..
    else
        echo -e "${YELLOW}[DRY RUN] Would rollback Vercel deployment${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed - skipping Vercel rollback${NC}"
fi

# 7. Verify rollback
echo -e "\n${GREEN}✔️  Step 6: Verifying rollback...${NC}"
echo "Git is now at tag: $PREVIOUS_TAG"
execute_cmd "git log --oneline -1"

# 8. Create rollback record
echo -e "\n${GREEN}📝 Step 7: Creating rollback record...${NC}"
ROLLBACK_RECORD="rollback_log_$(date +%Y%m%d_%H%M%S).txt"
cat > "$BACKUP_DIR/$ROLLBACK_RECORD" << EOF
Rollback performed at: $(date)
Rolled back from: $CURRENT_TAG
Rolled back to: $PREVIOUS_TAG
Reason: Manual rollback
Performed by: $(whoami)
EOF

echo -e "${GREEN}✅ Rollback record saved to: $BACKUP_DIR/$ROLLBACK_RECORD${NC}"

# 9. Post-rollback actions
echo -e "\n${GREEN}📋 Post-rollback checklist:${NC}"
echo "1. ✅ Git repository rolled back to $PREVIOUS_TAG"
if command -v gcloud &> /dev/null; then
    echo "2. ✅ Cloud Run service traffic updated"
fi
if command -v vercel &> /dev/null; then
    echo "3. ✅ Vercel deployment rolled back"
fi
echo "4. ⚠️  Please verify application is working correctly"
echo "5. ⚠️  Monitor error logs for any issues"
echo "6. ⚠️  Notify team about the rollback"

echo -e "\n${GREEN}✅ Rollback completed successfully!${NC}"
echo -e "${YELLOW}Backup saved in: $BACKUP_DIR${NC}"

# Optional: Send notification (uncomment and configure as needed)
# curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
#   -H 'Content-Type: application/json' \
#   -d "{\"text\":\"🔄 Deployment rolled back from $CURRENT_TAG to $PREVIOUS_TAG\"}"