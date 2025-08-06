#!/usr/bin/env node

/**
 * Test 2 - Red Phase: Identify unnecessary test files
 * This test should FAIL initially as it detects unnecessary test files
 */

const fs = require('fs');
const path = require('path');

class UnnecessaryTestFilesTest {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testDir = path.join(this.projectRoot, 'backend', 'tests');
        this.issues = [];
    }

    // Check for TDD phase files that should be temporary
    checkTDDPhaseFiles() {
        const phasePatterns = [
            /-red-phase\.test\.js$/i,
            /-green-phase\.test\.js$/i,
            /-duplicate-validation\.test\.js$/i,
            /-fixed-validation\.test\.js$/i,
            /-index-red\.test\.js$/i,
            /-index-green\.test\.js$/i
        ];

        this.scanDirectory(this.testDir, (file, filePath) => {
            phasePatterns.forEach(pattern => {
                if (pattern.test(file)) {
                    this.issues.push({
                        type: 'tdd_phase_file',
                        file: path.relative(this.projectRoot, filePath),
                        message: `Found TDD phase file: ${file}`
                    });
                }
            });
        });
    }

    // Check for quick test files that might be temporary
    checkQuickTestFiles() {
        const quickTestPatterns = [
            /quick-.*\.test\.js$/i,
            /.*-quick\.test\.js$/i,
            /quick-.*\.js$/i,
            /test-.*\.js$/i
        ];

        this.scanDirectory(this.testDir, (file, filePath) => {
            quickTestPatterns.forEach(pattern => {
                if (pattern.test(file)) {
                    this.issues.push({
                        type: 'quick_test_file',
                        file: path.relative(this.projectRoot, filePath),
                        message: `Found quick/temporary test file: ${file}`
                    });
                }
            });
        });
    }

    // Check for duplicate test files (similar functionality)
    checkDuplicateTestCases() {
        const testsByFeature = {};
        
        this.scanDirectory(this.testDir, (file, filePath) => {
            if (file.endsWith('.test.js')) {
                // Extract feature name (before first hyphen or dot)
                const featureName = file.split(/[-\.]/)[0];
                
                if (!testsByFeature[featureName]) {
                    testsByFeature[featureName] = [];
                }
                testsByFeature[featureName].push({
                    file,
                    path: path.relative(this.projectRoot, filePath)
                });
            }
        });

        // Check for features with many similar test files
        Object.entries(testsByFeature).forEach(([feature, tests]) => {
            if (tests.length > 3) { // More than 3 files for same feature might indicate duplication
                const hasPhasedTests = tests.some(t => 
                    t.file.includes('-phase') || t.file.includes('-red') || t.file.includes('-green')
                );
                
                if (hasPhasedTests) {
                    this.issues.push({
                        type: 'duplicate_feature_tests',
                        feature,
                        files: tests.map(t => t.file),
                        message: `Feature "${feature}" has ${tests.length} test files, likely contains duplicates`
                    });
                }
            }
        });
    }

    // Check for broken or obsolete test files by trying to parse them
    checkObsoleteTestFiles() {
        this.scanDirectory(this.testDir, (file, filePath) => {
            if (file.endsWith('.test.js')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // Check for imports/requires that might not exist
                    const importRegex = /(?:require\(['"`]([^'"`]+)['"`]\)|from\s+['"`]([^'"`]+)['"`])/g;
                    let match;
                    
                    while ((match = importRegex.exec(content)) !== null) {
                        const importPath = match[1] || match[2];
                        
                        // Skip node_modules imports
                        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                            continue;
                        }
                        
                        // Check if referenced file exists
                        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
                        const possibleFiles = [
                            resolvedPath,
                            resolvedPath + '.js',
                            resolvedPath + '/index.js'
                        ];
                        
                        const exists = possibleFiles.some(p => {
                            try {
                                return fs.existsSync(p);
                            } catch {
                                return false;
                            }
                        });
                        
                        if (!exists) {
                            this.issues.push({
                                type: 'broken_import',
                                file: path.relative(this.projectRoot, filePath),
                                importPath,
                                message: `Test file "${file}" has broken import: ${importPath}`
                            });
                        }
                    }
                } catch (error) {
                    this.issues.push({
                        type: 'unreadable_test',
                        file: path.relative(this.projectRoot, filePath),
                        message: `Cannot read test file: ${file} (${error.message})`
                    });
                }
            }
        });
    }

    // Utility method to scan directory recursively
    scanDirectory(dir, callback) {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                this.scanDirectory(itemPath, callback);
            } else {
                callback(item, itemPath);
            }
        });
    }

    runTest() {
        console.log('=== Test 2 - Red Phase: Unnecessary Test Files Test ===\n');
        
        this.checkTDDPhaseFiles();
        this.checkQuickTestFiles();
        this.checkDuplicateTestCases();
        this.checkObsoleteTestFiles();

        console.log(`Found ${this.issues.length} issues:\n`);
        
        this.issues.forEach((issue, index) => {
            if (issue.files) {
                console.log(`${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
                console.log(`   Files: ${issue.files.join(', ')}`);
            } else {
                console.log(`${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
            }
        });

        // Test should FAIL if issues are found (Red phase)
        if (this.issues.length > 0) {
            console.log(`\n❌ TEST FAILED: Found ${this.issues.length} unnecessary test files`);
            console.log('This failure is EXPECTED in the Red phase of TDD.');
            process.exit(1);
        } else {
            console.log('\n✅ TEST PASSED: No unnecessary test files found');
            process.exit(0);
        }
    }
}

// Run the test
const test = new UnnecessaryTestFilesTest();
test.runTest();