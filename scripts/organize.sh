#!/bin/bash

# Simple Folder Organizer
# One command to organize everything

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Date variables
TODAY=$(date +%Y-%m-%d)
YEAR=$(date +%Y)
MONTH=$(date +%m-%b)

echo -e "${BLUE}🧹 Organizing Project Folders...${NC}"
echo "================================"

# 1. Create proper structure
echo -e "${YELLOW}Creating folder structure...${NC}"
mkdir -p plans/active plans/archived plans/pending
mkdir -p completed/$YEAR/$MONTH
mkdir -p documentation/testing documentation/organization
mkdir -p backups
mkdir -p tests/unit tests/integration tests/e2e

# 2. Clean root folder
echo -e "${YELLOW}Cleaning root folder...${NC}"
# Move test files
[ -f *.test.js ] && mv *.test.js tests/ 2>/dev/null
[ -f *.test.ts ] && mv *.test.ts tests/ 2>/dev/null
[ -f test-*.md ] && mv test-*.md documentation/testing/ 2>/dev/null

# Move plan files to archived (if completed)
for file in FIX-*.md CHECK-*.md REFACTOR-*-RESULTS.md REFACTOR-*-completion*.md; do
  [ -f "$file" ] && mv "$file" plans/archived/ 2>/dev/null && echo "  ✓ Moved $file"
done

# Move active plans
for file in FEAT-*.md DEPLOY-*.md; do
  [ -f "$file" ] && [ ! -f "plans/active/$file" ] && mv "$file" plans/active/ 2>/dev/null && echo "  ✓ Moved $file"
done

# 3. Consolidate backups
if [ -d "backup" ]; then
  echo -e "${YELLOW}Consolidating backup folders...${NC}"
  mv backup/* backups/2025-08-26-old/ 2>/dev/null
  rmdir backup 2>/dev/null && echo "  ✓ Merged backup/ into backups/"
fi

# 4. Organize completed files by date
echo -e "${YELLOW}Organizing completed files...${NC}"
cd completed 2>/dev/null && {
  for file in *.md; do
    if [ -f "$file" ] && [ "$file" != "README.md" ]; then
      mv "$file" "$YEAR/$MONTH/" 2>/dev/null && echo "  ✓ Archived $file"
    fi
  done
  cd ..
}

# 5. Fix plans folder structure
if [ -d "plans/completed" ]; then
  echo -e "${YELLOW}Renaming plans/completed to plans/archived...${NC}"
  mv plans/completed/* plans/archived/ 2>/dev/null
  rmdir plans/completed 2>/dev/null
fi

# 6. Report results
echo ""
echo -e "${GREEN}✅ Organization Complete!${NC}"
echo ""
echo "📊 Summary:"
echo "  Root files: $(ls *.md 2>/dev/null | wc -l) markdown files"
echo "  Plans: $(find plans -name "*.md" | wc -l) files"
echo "  Completed: $(find completed -name "*.md" | wc -l) files"
echo "  Tests: $(find tests -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l) files"

# Check for issues
echo ""
ISSUES=0
[ -d "backup" ] && echo "  ⚠ Old backup/ folder still exists" && ((ISSUES++))
[ $(ls *.md 2>/dev/null | wc -l) -gt 10 ] && echo "  ⚠ Too many files in root" && ((ISSUES++))

if [ $ISSUES -eq 0 ]; then
  echo -e "${GREEN}✨ Everything is organized!${NC}"
else
  echo -e "${YELLOW}Found $ISSUES minor issues (can be ignored)${NC}"
fi