#!/bin/bash

# Google Cloud Secret Manager Setup Script
# Description: Create and configure secrets for production deployment
# Usage: ./setup-gcp-secrets.sh
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
PROJECT_ID="hr-backend-project"
SERVICE_ACCOUNT="hr-backend-sa"
REGION="asia-northeast3"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}    Google Cloud Secret Manager Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud SDK not installed${NC}"
    echo "Please install from: https://cloud.google.com/sdk/install"
    exit 1
fi

# Function to create or update a secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3
    
    echo -e "\n${YELLOW}Processing secret: $SECRET_NAME${NC}"
    
    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
        echo "Secret $SECRET_NAME already exists. Creating new version..."
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME \
            --data-file=- \
            --project=$PROJECT_ID
    else
        echo "Creating new secret $SECRET_NAME..."
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME \
            --data-file=- \
            --replication-policy="automatic" \
            --project=$PROJECT_ID
        
        # Add description if provided
        if [ -n "$DESCRIPTION" ]; then
            gcloud secrets update $SECRET_NAME \
                --update-labels="description=$DESCRIPTION" \
                --project=$PROJECT_ID
        fi
    fi
    
    echo -e "${GREEN}✅ Secret $SECRET_NAME configured${NC}"
}

# Function to grant access to service account
grant_access() {
    local SECRET_NAME=$1
    
    echo "Granting access to service account..."
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID &>/dev/null
}

# Main setup process
main() {
    # 1. Authenticate and set project
    echo -e "\n${BLUE}Step 1: Authenticating with Google Cloud${NC}"
    echo "Current project: $(gcloud config get-value project)"
    
    read -p "Is this the correct project? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        read -p "Enter the correct project ID: " PROJECT_ID
        gcloud config set project $PROJECT_ID
    fi
    
    # 2. Enable Secret Manager API
    echo -e "\n${BLUE}Step 2: Enabling Secret Manager API${NC}"
    gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
    
    # 3. Create secrets
    echo -e "\n${BLUE}Step 3: Creating secrets${NC}"
    echo -e "${YELLOW}⚠️  You will be prompted to enter sensitive values${NC}"
    
    # MongoDB URI
    echo -e "\n${YELLOW}MongoDB Production URI${NC}"
    echo "Format: mongodb+srv://username:password@cluster.mongodb.net/database"
    read -s -p "Enter MongoDB URI: " MONGODB_URI
    echo
    create_secret "mongodb-uri" "$MONGODB_URI" "MongoDB connection string"
    grant_access "mongodb-uri"
    
    # JWT Secret
    echo -e "\n${YELLOW}JWT Secret${NC}"
    echo "Generating random JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    create_secret "jwt-secret" "$JWT_SECRET" "JWT signing secret"
    grant_access "jwt-secret"
    
    # JWT Refresh Secret
    echo -e "\n${YELLOW}JWT Refresh Secret${NC}"
    echo "Generating random JWT refresh secret..."
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    create_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET" "JWT refresh token secret"
    grant_access "jwt-refresh-secret"
    
    # 4. Create service account if it doesn't exist
    echo -e "\n${BLUE}Step 4: Configuring service account${NC}"
    if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com --project=$PROJECT_ID &>/dev/null; then
        echo "Creating service account..."
        gcloud iam service-accounts create $SERVICE_ACCOUNT \
            --display-name="HR Backend Service Account" \
            --project=$PROJECT_ID
    else
        echo "Service account already exists"
    fi
    
    # 5. Grant necessary roles to service account
    echo -e "\n${BLUE}Step 5: Granting IAM roles${NC}"
    
    # Cloud Run Invoker
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/run.invoker" &>/dev/null
    
    # Secret Manager Secret Accessor
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" &>/dev/null
    
    echo -e "${GREEN}✅ IAM roles configured${NC}"
    
    # 6. Generate Cloud Run deployment command
    echo -e "\n${BLUE}Step 6: Generating deployment commands${NC}"
    
    cat > deploy-to-cloud-run.sh << 'EOF'
#!/bin/bash
# Cloud Run Deployment Script

PROJECT_ID="hr-backend-project"
SERVICE_NAME="hr-backend"
REGION="asia-northeast3"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Build and push Docker image
echo "Building Docker image..."
docker build -t $IMAGE .
docker push $IMAGE

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE \
    --platform=managed \
    --region=$REGION \
    --port=8080 \
    --memory=512Mi \
    --max-instances=10 \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production,PORT=8080" \
    --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest" \
    --service-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com

echo "Deployment complete!"
echo "Service URL: https://$SERVICE_NAME-$REGION.run.app"
EOF
    
    chmod +x deploy-to-cloud-run.sh
    
    echo -e "${GREEN}✅ Deployment script created: deploy-to-cloud-run.sh${NC}"
    
    # 7. Summary
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Secret Manager setup complete!${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    echo -e "\n${YELLOW}Created secrets:${NC}"
    gcloud secrets list --project=$PROJECT_ID --format="table(name,createTime)" --limit=5
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Review and run: ./deploy-to-cloud-run.sh"
    echo "2. Configure Vercel environment variables"
    echo "3. Update DNS records if needed"
    echo "4. Test the deployment"
}

# Run main function
main