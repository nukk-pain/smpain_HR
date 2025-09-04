#!/bin/bash

# Vercel Environment Variables Setup Script
# Description: Configure environment variables for Vercel deployment
# Usage: ./setup-vercel-env.sh
# Author: HR System Team
# Date: 2025-09-04

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="smpain-hr"
BACKEND_URL="https://hr-backend-429401177957.asia-northeast3.run.app"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}    Vercel Environment Variables Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Function to set environment variable
set_env_var() {
    local VAR_NAME=$1
    local VAR_VALUE=$2
    local ENV_TYPE=$3  # production, preview, development
    
    echo -e "\n${YELLOW}Setting $VAR_NAME for $ENV_TYPE${NC}"
    
    if [ "$ENV_TYPE" = "all" ]; then
        vercel env add $VAR_NAME production <<< "$VAR_VALUE"
        vercel env add $VAR_NAME preview <<< "$VAR_VALUE"
        vercel env add $VAR_NAME development <<< "$VAR_VALUE"
    else
        vercel env add $VAR_NAME $ENV_TYPE <<< "$VAR_VALUE"
    fi
    
    echo -e "${GREEN}✅ $VAR_NAME configured${NC}"
}

# Function to remove environment variable
remove_env_var() {
    local VAR_NAME=$1
    local ENV_TYPE=$2
    
    echo -e "${YELLOW}Removing $VAR_NAME from $ENV_TYPE${NC}"
    vercel env rm $VAR_NAME $ENV_TYPE --yes 2>/dev/null || true
}

# Main setup process
main() {
    # 1. Navigate to frontend directory
    if [ ! -d "frontend" ]; then
        echo -e "${RED}❌ Frontend directory not found${NC}"
        echo "Please run this script from the project root"
        exit 1
    fi
    
    cd frontend
    
    # 2. Login to Vercel
    echo -e "\n${BLUE}Step 1: Authenticating with Vercel${NC}"
    if ! vercel whoami &>/dev/null; then
        echo "Please login to Vercel..."
        vercel login
    else
        echo -e "${GREEN}✅ Already logged in as: $(vercel whoami)${NC}"
    fi
    
    # 3. Link to project
    echo -e "\n${BLUE}Step 2: Linking to Vercel project${NC}"
    if [ ! -f ".vercel/project.json" ]; then
        echo "Linking to Vercel project..."
        vercel link
    else
        echo -e "${GREEN}✅ Already linked to project${NC}"
    fi
    
    # 4. Configure environment variables
    echo -e "\n${BLUE}Step 3: Configuring environment variables${NC}"
    
    # Production variables
    echo -e "\n${YELLOW}Setting production environment variables...${NC}"
    
    # API URL
    remove_env_var "VITE_API_URL" "production"
    set_env_var "VITE_API_URL" "$BACKEND_URL" "production"
    
    # App Environment
    remove_env_var "VITE_APP_ENV" "production"
    set_env_var "VITE_APP_ENV" "production" "production"
    
    # Feature Flags
    remove_env_var "VITE_ENABLE_REFRESH_TOKENS" "production"
    set_env_var "VITE_ENABLE_REFRESH_TOKENS" "true" "production"
    
    remove_env_var "VITE_ENABLE_ADMIN_ONLY_PAYROLL" "production"
    set_env_var "VITE_ENABLE_ADMIN_ONLY_PAYROLL" "true" "production"
    
    # App Configuration
    remove_env_var "VITE_APP_NAME" "production"
    set_env_var "VITE_APP_NAME" "SM Pain HR System" "production"
    
    remove_env_var "VITE_APP_VERSION" "production"
    set_env_var "VITE_APP_VERSION" "1.0.0" "production"
    
    # Preview/Development variables
    echo -e "\n${YELLOW}Setting preview environment variables...${NC}"
    
    remove_env_var "VITE_API_URL" "preview"
    set_env_var "VITE_API_URL" "$BACKEND_URL" "preview"
    
    remove_env_var "VITE_APP_ENV" "preview"
    set_env_var "VITE_APP_ENV" "preview" "preview"
    
    # Development variables (local)
    echo -e "\n${YELLOW}Setting development environment variables...${NC}"
    
    remove_env_var "VITE_API_URL" "development"
    set_env_var "VITE_API_URL" "http://localhost:5455" "development"
    
    remove_env_var "VITE_APP_ENV" "development"
    set_env_var "VITE_APP_ENV" "development" "development"
    
    # 5. List all environment variables
    echo -e "\n${BLUE}Step 4: Verifying configuration${NC}"
    echo -e "\n${YELLOW}Production environment variables:${NC}"
    vercel env ls production
    
    # 6. Create local .env file for reference
    echo -e "\n${BLUE}Step 5: Creating local .env.production${NC}"
    
    cat > .env.production << EOF
# Production Environment Variables (Vercel)
# Generated: $(date +%Y-%m-%d)

VITE_API_URL=$BACKEND_URL
VITE_APP_ENV=production
VITE_ENABLE_REFRESH_TOKENS=true
VITE_ENABLE_ADMIN_ONLY_PAYROLL=true
VITE_APP_NAME=SM Pain HR System
VITE_APP_VERSION=1.0.0

# Additional configuration
VITE_SESSION_TIMEOUT=86400000  # 24 hours
VITE_IDLE_TIMEOUT=1800000      # 30 minutes
VITE_TOKEN_REFRESH_INTERVAL=3300000  # 55 minutes

# Feature flags
VITE_ENABLE_PWA=false
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=true
EOF
    
    echo -e "${GREEN}✅ Local .env.production created${NC}"
    
    # 7. Deployment commands
    echo -e "\n${BLUE}Step 6: Generating deployment commands${NC}"
    
    cat > ../deploy-to-vercel.sh << 'EOF'
#!/bin/bash
# Vercel Deployment Script

echo "Deploying frontend to Vercel..."

cd frontend

# Build check
echo "Running build check..."
npm run build-check

if [ $? -ne 0 ]; then
    echo "❌ Build check failed. Fix errors before deploying."
    exit 1
fi

# Deploy to production
echo "Deploying to production..."
vercel --prod

echo "✅ Deployment complete!"
echo "Visit: https://smpain-hr.vercel.app"
EOF
    
    chmod +x ../deploy-to-vercel.sh
    
    echo -e "${GREEN}✅ Deployment script created: deploy-to-vercel.sh${NC}"
    
    # 8. Summary
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Vercel setup complete!${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Review environment variables above"
    echo "2. Run deployment: ./deploy-to-vercel.sh"
    echo "3. Test the deployment at: https://smpain-hr.vercel.app"
    echo "4. Monitor deployment: vercel logs --follow"
    
    cd ..
}

# Run main function
main