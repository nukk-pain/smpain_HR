#!/bin/bash

# Fix Grid item props in all TypeScript files
echo "Fixing Grid item props in TypeScript files..."

# Pattern 1: <Grid item xs={number}>
find src -name "*.tsx" -type f -exec sed -i 's/<Grid item xs={\([0-9]\+\)}>/<Grid size={\1}>/g' {} \;

# Pattern 2: <Grid item xs={number} sm={number}>
find src -name "*.tsx" -type f -exec sed -i 's/<Grid item xs={\([0-9]\+\)} sm={\([0-9]\+\)}>/<Grid size={{ xs: \1, sm: \2 }}>/g' {} \;

# Pattern 3: <Grid item xs={number} md={number}>
find src -name "*.tsx" -type f -exec sed -i 's/<Grid item xs={\([0-9]\+\)} md={\([0-9]\+\)}>/<Grid size={{ xs: \1, md: \2 }}>/g' {} \;

# Pattern 4: <Grid item xs={number} sm={number} md={number}>
find src -name "*.tsx" -type f -exec sed -i 's/<Grid item xs={\([0-9]\+\)} sm={\([0-9]\+\)} md={\([0-9]\+\)}>/<Grid size={{ xs: \1, sm: \2, md: \3 }}>/g' {} \;

# Pattern 5: <Grid item xs={number} sm={number} md={number} lg={number}>
find src -name "*.tsx" -type f -exec sed -i 's/<Grid item xs={\([0-9]\+\)} sm={\([0-9]\+\)} md={\([0-9]\+\)} lg={\([0-9]\+\)}>/<Grid size={{ xs: \1, sm: \2, md: \3, lg: \4 }}>/g' {} \;

echo "Grid item prop fixes completed!"

# Count remaining Grid item occurrences
echo "Checking for remaining Grid item props..."
grep -r "Grid item" src --include="*.tsx" | wc -l