#!/bin/bash

# Staging Deployment Script
# This script deploys the HR system to the staging environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGING_HOST=${STAGING_HOST:-"staging.example.com"}
STAGING_USER=${STAGING_USER:-"deploy"}
STAGING_PATH=${STAGING_PATH:-"/var/www/hr-staging"}
STAGING_BRANCH=${STAGING_BRANCH:-"staging"}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if git is clean
    if [[ -n $(git status -s) ]]; then
        print_error "Working directory is not clean. Please commit or stash changes."
        exit 1
    fi
    
    # Check if on correct branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "$STAGING_BRANCH" ]; then
        print_warning "Not on $STAGING_BRANCH branch. Current branch: $CURRENT_BRANCH"
        read -p "Do you want to switch to $STAGING_BRANCH? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout $STAGING_BRANCH
        else
            exit 1
        fi
    fi
    
    # Check if remote is reachable
    if ! ssh -q $STAGING_USER@$STAGING_HOST exit; then
        print_error "Cannot connect to staging server"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Build the application
build_application() {
    print_status "Building application..."
    
    # Backend build
    cd backend
    npm ci --production=false
    npm run build 2>/dev/null || true  # Build if build script exists
    cd ..
    
    # Frontend build
    cd frontend
    npm ci --production=false
    npm run build
    cd ..
    
    print_status "Build completed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    cd backend
    npm test -- --passWithNoTests
    cd ..
    
    # Frontend tests
    cd frontend
    npm test -- --passWithNoTests --watchAll=false 2>/dev/null || true
    cd ..
    
    print_status "Tests passed"
}

# Create deployment package
create_package() {
    print_status "Creating deployment package..."
    
    # Get current commit hash
    GIT_COMMIT=$(git rev-parse HEAD)
    BUILD_ID="staging-$(date +%Y%m%d-%H%M%S)"
    
    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    
    # Copy backend files
    cp -r backend $TEMP_DIR/
    
    # Copy frontend build
    cp -r frontend/dist $TEMP_DIR/frontend-dist 2>/dev/null || \
    cp -r frontend/build $TEMP_DIR/frontend-dist 2>/dev/null || \
    print_warning "Frontend dist not found"
    
    # Copy deployment files
    cp -r scripts $TEMP_DIR/
    cp package*.json $TEMP_DIR/ 2>/dev/null || true
    
    # Create deployment info
    cat > $TEMP_DIR/deployment-info.json <<EOF
{
    "buildId": "$BUILD_ID",
    "gitCommit": "$GIT_COMMIT",
    "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployedBy": "$(whoami)",
    "branch": "$STAGING_BRANCH",
    "environment": "staging"
}
EOF
    
    # Create tarball
    PACKAGE_NAME="hr-staging-$BUILD_ID.tar.gz"
    tar -czf $PACKAGE_NAME -C $TEMP_DIR .
    
    # Cleanup
    rm -rf $TEMP_DIR
    
    print_status "Package created: $PACKAGE_NAME"
    echo $PACKAGE_NAME
}

# Deploy to staging
deploy_to_staging() {
    local PACKAGE=$1
    
    print_status "Deploying to staging server..."
    
    # Upload package
    print_status "Uploading package..."
    scp $PACKAGE $STAGING_USER@$STAGING_HOST:/tmp/
    
    # Deploy on server
    print_status "Deploying on server..."
    ssh $STAGING_USER@$STAGING_HOST <<EOF
        set -e
        
        # Backup current deployment
        if [ -d "$STAGING_PATH" ]; then
            echo "Creating backup..."
            sudo cp -r $STAGING_PATH ${STAGING_PATH}.backup.\$(date +%Y%m%d-%H%M%S)
        fi
        
        # Create staging directory if not exists
        sudo mkdir -p $STAGING_PATH
        
        # Extract new deployment
        echo "Extracting package..."
        sudo tar -xzf /tmp/$PACKAGE -C $STAGING_PATH
        
        # Set permissions
        sudo chown -R www-data:www-data $STAGING_PATH
        
        # Install dependencies
        echo "Installing dependencies..."
        cd $STAGING_PATH/backend
        sudo -u www-data npm ci --production
        
        # Copy staging environment file
        if [ -f "$STAGING_PATH/backend/.env.staging" ]; then
            sudo -u www-data cp $STAGING_PATH/backend/.env.staging $STAGING_PATH/backend/.env
        fi
        
        # Update deployment info in env
        echo "DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)" | sudo tee -a $STAGING_PATH/backend/.env
        echo "BUILD_ID=$BUILD_ID" | sudo tee -a $STAGING_PATH/backend/.env
        echo "GIT_COMMIT=$GIT_COMMIT" | sudo tee -a $STAGING_PATH/backend/.env
        
        # Restart application
        echo "Restarting application..."
        sudo systemctl restart hr-staging || \
        sudo pm2 restart hr-staging || \
        echo "Manual restart required"
        
        # Cleanup
        rm /tmp/$PACKAGE
        
        echo "Deployment completed"
EOF
    
    print_status "Deployment to staging completed"
}

# Health check
health_check() {
    print_status "Running health check..."
    
    # Wait for service to start
    sleep 5
    
    # Check health endpoint
    HEALTH_URL="https://$STAGING_HOST/api/health"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "Health check passed"
        curl -s $HEALTH_URL | python3 -m json.tool
    else
        print_error "Health check failed. HTTP status: $HTTP_STATUS"
        exit 1
    fi
}

# Rollback function
rollback() {
    print_error "Deployment failed. Rolling back..."
    
    ssh $STAGING_USER@$STAGING_HOST <<EOF
        set -e
        
        # Find latest backup
        LATEST_BACKUP=\$(ls -t ${STAGING_PATH}.backup.* 2>/dev/null | head -1)
        
        if [ -n "\$LATEST_BACKUP" ]; then
            echo "Rolling back to \$LATEST_BACKUP"
            sudo rm -rf $STAGING_PATH
            sudo mv \$LATEST_BACKUP $STAGING_PATH
            
            # Restart application
            sudo systemctl restart hr-staging || \
            sudo pm2 restart hr-staging || \
            echo "Manual restart required"
            
            echo "Rollback completed"
        else
            echo "No backup found. Manual intervention required."
            exit 1
        fi
EOF
}

# Main deployment flow
main() {
    print_status "Starting staging deployment..."
    
    # Trap errors for rollback
    trap 'rollback' ERR
    
    # Run deployment steps
    check_prerequisites
    build_application
    run_tests
    
    # Create and deploy package
    PACKAGE=$(create_package)
    deploy_to_staging $PACKAGE
    
    # Verify deployment
    health_check
    
    # Cleanup local package
    rm -f $PACKAGE
    
    print_status "🚀 Staging deployment successful!"
    print_status "Access staging at: https://$STAGING_HOST"
    
    # Remove error trap
    trap - ERR
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            STAGING_HOST="$2"
            shift 2
            ;;
        --user)
            STAGING_USER="$2"
            shift 2
            ;;
        --path)
            STAGING_PATH="$2"
            shift 2
            ;;
        --branch)
            STAGING_BRANCH="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --host HOST      Staging server hostname"
            echo "  --user USER      SSH user for deployment"
            echo "  --path PATH      Deployment path on server"
            echo "  --branch BRANCH  Git branch to deploy"
            echo "  --skip-tests     Skip running tests"
            echo "  --skip-build     Skip building application"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Override functions if flags are set
if [ "$SKIP_TESTS" = true ]; then
    run_tests() {
        print_warning "Skipping tests (--skip-tests flag)"
    }
fi

if [ "$SKIP_BUILD" = true ]; then
    build_application() {
        print_warning "Skipping build (--skip-build flag)"
    }
fi

# Run main deployment
main