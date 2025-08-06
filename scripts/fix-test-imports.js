#!/usr/bin/env node

/**
 * Fix import paths for moved test files
 */

const fs = require('fs');
const path = require('path');

class TestImportFixer {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.fixes = [];
    }

    fixImportsInDirectory(dir) {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                this.fixImportsInDirectory(itemPath);
            } else if (item.endsWith('.test.js')) {
                this.fixImportsInFile(itemPath);
            }
        });
    }

    fixImportsInFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            let newContent = content;
            let hasChanges = false;

            // Fix relative paths that need an extra "../" due to being moved to subdirectory
            const importRegex = /(require\(['"`])(\.\.\/\.\.\/[^'"`]+)(['"`]\))/g;
            
            newContent = newContent.replace(importRegex, (match, prefix, importPath, suffix) => {
                // Add an extra "../" to go up one more level
                const fixedPath = '../' + importPath;
                hasChanges = true;
                return prefix + fixedPath + suffix;
            });

            // Also fix ES6 import syntax if any
            const es6ImportRegex = /(from\s+['"`])(\.\.\/\.\.\/[^'"`]+)(['"`])/g;
            
            newContent = newContent.replace(es6ImportRegex, (match, prefix, importPath, suffix) => {
                const fixedPath = '../' + importPath;
                hasChanges = true;
                return prefix + fixedPath + suffix;
            });

            if (hasChanges) {
                fs.writeFileSync(filePath, newContent);
                this.fixes.push(`Fixed imports in: ${path.relative(this.projectRoot, filePath)}`);
            }
        } catch (error) {
            console.log(`Warning: Could not fix imports in ${filePath}: ${error.message}`);
        }
    }

    runFixes() {
        console.log('=== Fixing Test Import Paths ===\n');
        
        const testDir = path.join(this.projectRoot, 'backend', 'tests');
        this.fixImportsInDirectory(testDir);

        console.log(`Fixed ${this.fixes.length} files:\n`);
        
        this.fixes.forEach((fix, index) => {
            console.log(`${index + 1}. ${fix}`);
        });

        if (this.fixes.length === 0) {
            console.log('✅ No import fixes needed');
        } else {
            console.log(`\n✅ Import fixes complete`);
        }
    }
}

// Run the fixes
const fixer = new TestImportFixer();
fixer.runFixes();