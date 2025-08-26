#!/bin/bash

# Folder Organizer Script
# Based on ROOT-ORGANIZATION-RULES.md
# Usage: ./folder-organizer.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current date
TODAY=$(date +%Y-%m-%d)
YEAR=$(date +%Y)
MONTH=$(date +%m)
MONTH_NAME=$(date +%b)

echo -e "${BLUE}🗂️  Folder Organizer - $TODAY${NC}"
echo "================================"

case "$1" in
  "qo"|"quick-organize")
    echo -e "${YELLOW}📋 Quick Organize: Cleaning root folder...${NC}"
    
    # Move test files to tests/
    if ls *.test.* 2>/dev/null; then
      mkdir -p tests
      mv *.test.* tests/ 2>/dev/null && echo "  ✓ Moved test files to tests/"
    fi
    
    # Move personal files to completed
    if ls todo-personal.md todo.md 2>/dev/null; then
      mkdir -p completed
      mv todo-personal.md todo.md completed/ 2>/dev/null && echo "  ✓ Moved personal files to completed/"
    fi
    
    # Count remaining files
    ROOT_FILES=$(ls *.md 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Root now has $ROOT_FILES files${NC}"
    ;;
    
  "cr"|"clean-root")
    echo -e "${YELLOW}🧹 Clean Root: Moving non-essential files...${NC}"
    
    # Create necessary folders
    mkdir -p plans/active plans/archived completed documentation/testing
    
    # Move plan files
    for file in FEAT-*.md FIX-*.md REFACTOR-*.md TEST-*.md DEPLOY-*.md CHECK-*.md; do
      if [ -f "$file" ]; then
        mv "$file" plans/archived/ 2>/dev/null && echo "  ✓ Moved $file to plans/archived/"
      fi
    done
    
    # Move test plans
    for file in *TEST*.md *test*.md; do
      if [ -f "$file" ] && [[ "$file" != "README.md" ]]; then
        mv "$file" documentation/testing/ 2>/dev/null && echo "  ✓ Moved $file to documentation/testing/"
      fi
    done
    
    echo -e "${GREEN}✅ Root cleaned${NC}"
    ;;
    
  "cb"|"consolidate-backups")
    echo -e "${YELLOW}💾 Consolidate Backups: Merging backup folders...${NC}"
    
    # Create main backups folder
    mkdir -p backups
    
    # Move backup folder contents
    if [ -d "backup" ]; then
      mkdir -p "backups/${TODAY}-legacy"
      mv backup/* "backups/${TODAY}-legacy/" 2>/dev/null
      rmdir backup 2>/dev/null && echo "  ✓ Merged backup/ into backups/"
    fi
    
    echo -e "${GREEN}✅ Backups consolidated${NC}"
    ;;
    
  "abd"|"archive-by-date")
    echo -e "${YELLOW}📅 Archive by Date: Organizing completed files...${NC}"
    
    # Create year/month structure
    mkdir -p "completed/$YEAR/${MONTH}-${MONTH_NAME}"
    
    # Move recent completed files
    if [ -d "completed" ]; then
      for file in completed/*.md; do
        if [ -f "$file" ]; then
          filename=$(basename "$file")
          if [[ ! "$filename" == "README.md" ]]; then
            mv "$file" "completed/$YEAR/${MONTH}-${MONTH_NAME}/" 2>/dev/null && \
              echo "  ✓ Moved $filename to $YEAR/${MONTH}-${MONTH_NAME}/"
          fi
        fi
      done
    fi
    
    echo -e "${GREEN}✅ Files archived by date${NC}"
    ;;
    
  "vs"|"validate-structure")
    echo -e "${YELLOW}🔍 Validate Structure: Checking compliance...${NC}"
    
    # Check for duplicate folders
    ISSUES=0
    
    if [ -d "backup" ] && [ -d "backups" ]; then
      echo -e "${RED}  ✗ Duplicate folders: backup/ and backups/${NC}"
      ((ISSUES++))
    fi
    
    if [ -d "plans/completed" ]; then
      echo -e "${RED}  ✗ Should be plans/archived not plans/completed${NC}"
      ((ISSUES++))
    fi
    
    # Check root file count
    ROOT_COUNT=$(ls *.md 2>/dev/null | wc -l)
    if [ $ROOT_COUNT -gt 10 ]; then
      echo -e "${YELLOW}  ⚠ Root has $ROOT_COUNT files (should be < 10)${NC}"
      ((ISSUES++))
    fi
    
    # Check essential folders exist
    for folder in backend frontend scripts docs completed plans; do
      if [ ! -d "$folder" ]; then
        echo -e "${YELLOW}  ⚠ Missing essential folder: $folder/${NC}"
        ((ISSUES++))
      fi
    done
    
    if [ $ISSUES -eq 0 ]; then
      echo -e "${GREEN}✅ Structure is compliant!${NC}"
    else
      echo -e "${YELLOW}Found $ISSUES issues to fix${NC}"
    fi
    ;;
    
  "cm"|"create-monthly")
    echo -e "${YELLOW}📆 Create Monthly: Setting up this month's folders...${NC}"
    
    # Create this month's folders
    mkdir -p "completed/$YEAR/${MONTH}-${MONTH_NAME}"
    mkdir -p "plans/active"
    
    # Create README for the month
    cat > "completed/$YEAR/${MONTH}-${MONTH_NAME}/README.md" << EOF
# Completed Work - $MONTH_NAME $YEAR

## Week 1
- 

## Week 2
- 

## Week 3
- 

## Week 4
- 

## Summary
- Total completed: 0
- Major achievements: 
EOF
    
    echo "  ✓ Created completed/$YEAR/${MONTH}-${MONTH_NAME}/"
    echo "  ✓ Created monthly README"
    echo -e "${GREEN}✅ Monthly folders ready${NC}"
    ;;
    
  "fr"|"folder-report")
    echo -e "${YELLOW}📊 Folder Report: Analyzing structure...${NC}"
    echo ""
    
    # Count files in each major folder
    echo "📁 File counts by folder:"
    for dir in backend frontend scripts docs completed plans tests; do
      if [ -d "$dir" ]; then
        COUNT=$(find "$dir" -type f | wc -l)
        printf "  %-15s: %4d files\n" "$dir" "$COUNT"
      fi
    done
    
    echo ""
    echo "📏 Root directory status:"
    ROOT_MD=$(ls *.md 2>/dev/null | wc -l)
    ROOT_TOTAL=$(ls 2>/dev/null | wc -l)
    echo "  Markdown files: $ROOT_MD"
    echo "  Total items: $ROOT_TOTAL"
    
    echo ""
    echo "🔍 Potential issues:"
    [ -d "backup" ] && echo "  ⚠ Old backup/ folder exists"
    [ -d "plans/completed" ] && echo "  ⚠ plans/completed should be plans/archived"
    [ $ROOT_MD -gt 10 ] && echo "  ⚠ Too many files in root ($ROOT_MD > 10)"
    
    echo -e "\n${GREEN}✅ Report complete${NC}"
    ;;
    
  *)
    echo "Usage: $0 {qo|cr|cb|abd|vs|cm|fr}"
    echo ""
    echo "Commands:"
    echo "  qo  - Quick Organize (daily cleanup)"
    echo "  cr  - Clean Root (move files to proper folders)"
    echo "  cb  - Consolidate Backups"
    echo "  abd - Archive By Date"
    echo "  vs  - Validate Structure"
    echo "  cm  - Create Monthly folders"
    echo "  fr  - Folder Report"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}Done! Use 'vs' to validate the structure.${NC}"