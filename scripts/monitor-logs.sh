#!/bin/bash

# 📊 Production Monitoring Script
# Description: Monitor logs and system health
# Usage: ./monitor-logs.sh [--cloud] [--local] [--errors-only] [--follow]
# Author: HR System Team
# Date: 2025-09-04

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
GCP_PROJECT_ID="hr-backend-project"
GCP_SERVICE_NAME="hr-backend"
GCP_REGION="asia-northeast3"
LOCAL_LOG_PATH="backend/logs"
VERCEL_PROJECT="smpain-hr"

# Parse arguments
MODE="local"
ERRORS_ONLY=false
FOLLOW=false
LINES=50

for arg in "$@"; do
    case $arg in
        --cloud)
            MODE="cloud"
            ;;
        --local)
            MODE="local"
            ;;
        --errors-only)
            ERRORS_ONLY=true
            ;;
        --follow)
            FOLLOW=true
            ;;
        --lines=*)
            LINES="${arg#*=}"
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --cloud        Monitor Google Cloud Run logs"
            echo "  --local        Monitor local application logs (default)"
            echo "  --errors-only  Show only error logs"
            echo "  --follow       Follow log output (tail -f)"
            echo "  --lines=N      Number of lines to display (default: 50)"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}    Production Log Monitor v1.0${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# Function to monitor Google Cloud logs
monitor_cloud_logs() {
    echo -e "\n${CYAN}☁️  Monitoring Google Cloud Run logs...${NC}"
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ Google Cloud SDK not installed${NC}"
        echo "Install from: https://cloud.google.com/sdk/install"
        exit 1
    fi
    
    # Set project
    gcloud config set project $GCP_PROJECT_ID 2>/dev/null
    
    if [ "$ERRORS_ONLY" = true ]; then
        echo -e "${YELLOW}📋 Showing only ERROR and CRITICAL logs${NC}\n"
        
        if [ "$FOLLOW" = true ]; then
            # Stream error logs
            gcloud logging read \
                "resource.type=cloud_run_revision AND \
                 resource.labels.service_name=$GCP_SERVICE_NAME AND \
                 severity>=ERROR" \
                --format="table(timestamp,severity,textPayload)" \
                --freshness=1d \
                --order=desc \
                --limit=$LINES
            
            # Continue monitoring
            echo -e "\n${YELLOW}Streaming new error logs (Ctrl+C to stop)...${NC}"
            gcloud alpha logging tail \
                "resource.type=cloud_run_revision AND \
                 resource.labels.service_name=$GCP_SERVICE_NAME AND \
                 severity>=ERROR" \
                --format="value(timestamp,severity,textPayload)"
        else
            # Show recent error logs
            gcloud logging read \
                "resource.type=cloud_run_revision AND \
                 resource.labels.service_name=$GCP_SERVICE_NAME AND \
                 severity>=ERROR" \
                --format="table(timestamp,severity,textPayload)" \
                --freshness=1d \
                --order=desc \
                --limit=$LINES
        fi
    else
        echo -e "${YELLOW}📋 Showing all logs${NC}\n"
        
        if [ "$FOLLOW" = true ]; then
            # Stream all logs
            echo -e "${YELLOW}Streaming logs (Ctrl+C to stop)...${NC}"
            gcloud alpha logging tail \
                "resource.type=cloud_run_revision AND \
                 resource.labels.service_name=$GCP_SERVICE_NAME" \
                --format="value(timestamp,severity,textPayload)"
        else
            # Show recent logs
            gcloud logging read \
                "resource.type=cloud_run_revision AND \
                 resource.labels.service_name=$GCP_SERVICE_NAME" \
                --format="table(timestamp,severity,textPayload)" \
                --freshness=1d \
                --order=desc \
                --limit=$LINES
        fi
    fi
    
    # Show metrics summary
    echo -e "\n${CYAN}📊 Metrics Summary (last hour):${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Request count
    echo -n "Total Requests: "
    gcloud monitoring read \
        "serviceruntime.googleapis.com/api/request_count" \
        --filter="resource.type=api AND resource.labels.service=$GCP_SERVICE_NAME" \
        --format="value(point.value.int64_value)" \
        --start-time="-1h" 2>/dev/null | tail -1 || echo "N/A"
    
    # Error rate
    echo -n "Error Rate: "
    gcloud monitoring read \
        "serviceruntime.googleapis.com/api/request_count" \
        --filter="resource.type=api AND metric.labels.response_code_class=5xx" \
        --format="value(point.value.int64_value)" \
        --start-time="-1h" 2>/dev/null | tail -1 || echo "N/A"
}

# Function to monitor local logs
monitor_local_logs() {
    echo -e "\n${CYAN}💻 Monitoring local application logs...${NC}"
    
    # Check if log directory exists
    if [ ! -d "$LOCAL_LOG_PATH" ]; then
        echo -e "${YELLOW}⚠️  Log directory not found: $LOCAL_LOG_PATH${NC}"
        echo "Creating log directory..."
        mkdir -p "$LOCAL_LOG_PATH"
    fi
    
    # Find log files
    LOG_FILES=$(find "$LOCAL_LOG_PATH" -name "*.log" -type f 2>/dev/null)
    
    if [ -z "$LOG_FILES" ]; then
        echo -e "${YELLOW}⚠️  No log files found in $LOCAL_LOG_PATH${NC}"
        
        # Check PM2 logs if available
        if command -v pm2 &> /dev/null; then
            echo -e "\n${CYAN}Checking PM2 logs...${NC}"
            pm2 logs --lines $LINES --nostream
        fi
        
        # Check systemd journal if available
        if command -v journalctl &> /dev/null; then
            echo -e "\n${CYAN}Checking systemd logs...${NC}"
            sudo journalctl -u node-app --lines $LINES --no-pager 2>/dev/null || \
                echo "No systemd logs found"
        fi
    else
        echo -e "${GREEN}Found log files:${NC}"
        echo "$LOG_FILES" | while read -r file; do
            echo "  - $(basename $file)"
        done
        
        if [ "$ERRORS_ONLY" = true ]; then
            echo -e "\n${YELLOW}📋 Showing only ERROR logs${NC}"
            
            if [ "$FOLLOW" = true ]; then
                tail -f $LOG_FILES | grep -E "ERROR|CRITICAL|FATAL|Exception|Error:" --color=always
            else
                grep -E "ERROR|CRITICAL|FATAL|Exception|Error:" $LOG_FILES --color=always | tail -n $LINES
            fi
        else
            echo -e "\n${YELLOW}📋 Showing all logs${NC}"
            
            if [ "$FOLLOW" = true ]; then
                tail -f $LOG_FILES
            else
                tail -n $LINES $LOG_FILES
            fi
        fi
    fi
    
    # Show local process status
    echo -e "\n${CYAN}📊 Local Process Status:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if backend is running
    if pgrep -f "node.*backend" > /dev/null; then
        echo -e "Backend: ${GREEN}● Running${NC}"
        echo "  PID: $(pgrep -f 'node.*backend')"
        echo "  Memory: $(ps aux | grep 'node.*backend' | grep -v grep | awk '{print $6/1024 "MB"}')"
    else
        echo -e "Backend: ${RED}● Stopped${NC}"
    fi
    
    # Check if frontend is running
    if pgrep -f "vite|react-scripts" > /dev/null; then
        echo -e "Frontend: ${GREEN}● Running${NC}"
        echo "  PID: $(pgrep -f 'vite|react-scripts')"
    else
        echo -e "Frontend: ${RED}● Stopped${NC}"
    fi
    
    # Check MongoDB
    if pgrep -x mongod > /dev/null; then
        echo -e "MongoDB: ${GREEN}● Running${NC}"
        echo "  PID: $(pgrep -x mongod)"
    else
        echo -e "MongoDB: ${RED}● Stopped${NC}"
    fi
}

# Function to monitor Vercel logs
monitor_vercel_logs() {
    echo -e "\n${CYAN}▲ Monitoring Vercel deployment logs...${NC}"
    
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
        return
    fi
    
    cd frontend 2>/dev/null || {
        echo -e "${RED}❌ Frontend directory not found${NC}"
        return
    }
    
    echo -e "${YELLOW}📋 Recent deployment logs:${NC}"
    vercel logs --follow=$FOLLOW --limit=$LINES
    
    cd ..
}

# Function to show health check status
show_health_status() {
    echo -e "\n${CYAN}🏥 Health Check Status:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check production API
    PROD_URL="https://hr-backend-429401177957.asia-northeast3.run.app"
    echo -n "Production API: "
    if curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health" | grep -q "200"; then
        echo -e "${GREEN}● Healthy${NC}"
    else
        echo -e "${RED}● Unhealthy${NC}"
    fi
    
    # Check Vercel frontend
    FRONTEND_URL="https://smpain-hr.vercel.app"
    echo -n "Frontend: "
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
        echo -e "${GREEN}● Healthy${NC}"
    else
        echo -e "${RED}● Unhealthy${NC}"
    fi
    
    # Check local services if running locally
    if [ "$MODE" = "local" ]; then
        echo -n "Local Backend: "
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5455/api/health" 2>/dev/null | grep -q "200"; then
            echo -e "${GREEN}● Healthy${NC}"
        else
            echo -e "${RED}● Unhealthy${NC}"
        fi
        
        echo -n "Local Frontend: "
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3727" 2>/dev/null | grep -q "200"; then
            echo -e "${GREEN}● Healthy${NC}"
        else
            echo -e "${RED}● Unhealthy${NC}"
        fi
    fi
}

# Function to show summary dashboard
show_dashboard() {
    clear
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}         HR System Monitor Dashboard${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "Mode: $MODE | Errors Only: $ERRORS_ONLY"
    echo ""
    
    show_health_status
    
    echo -e "\n${CYAN}📈 Quick Stats:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━"
    
    # Disk usage
    echo -n "Disk Usage: "
    df -h . | awk 'NR==2 {print $5}'
    
    # Memory usage
    echo -n "Memory: "
    free -h | awk 'NR==2 {print $3"/"$2}'
    
    # Load average
    echo -n "Load: "
    uptime | awk -F'load average:' '{print $2}'
}

# Main execution
main() {
    # Show dashboard if not following logs
    if [ "$FOLLOW" = false ]; then
        show_dashboard
    fi
    
    # Execute monitoring based on mode
    case "$MODE" in
        "cloud")
            monitor_cloud_logs
            monitor_vercel_logs
            ;;
        "local")
            monitor_local_logs
            ;;
    esac
    
    # Show footer
    if [ "$FOLLOW" = false ]; then
        echo -e "\n${BLUE}═══════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Tip: Use --follow to stream logs in real-time${NC}"
        echo -e "${YELLOW}Tip: Use --errors-only to filter error logs${NC}"
    fi
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Monitoring stopped${NC}"; exit 0' INT

# Run main function
main