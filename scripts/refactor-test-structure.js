#!/usr/bin/env node

/**
 * Test 2 - Refactor Phase: Improve test structure and organization
 */

const fs = require('fs');
const path = require('path');

class TestStructureRefactorer {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testDir = path.join(this.projectRoot, 'backend', 'tests');
        this.changes = [];
    }

    // Standardize test file naming conventions
    standardizeTestFileNames() {
        const directories = [
            path.join(this.testDir, 'integration'),
            path.join(this.testDir, 'unit'),
            path.join(this.testDir, 'utils'),
            path.join(this.testDir, 'repositories')
        ];

        directories.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                
                files.forEach(file => {
                    if (file.endsWith('.test.js')) {
                        // Convert underscores to hyphens and ensure consistent naming
                        let newName = file.replace(/_/g, '-');
                        
                        // Ensure .test.js extension is consistent
                        if (!newName.includes('.test.js')) {
                            newName = newName.replace('.js', '.test.js');
                        }
                        
                        if (newName !== file) {
                            const oldPath = path.join(dir, file);
                            const newPath = path.join(dir, newName);
                            
                            if (!fs.existsSync(newPath)) {
                                fs.renameSync(oldPath, newPath);
                                this.changes.push(`Renamed test file: ${file} → ${newName}`);
                            }
                        }
                    }
                });
            }
        });
    }

    // Group related tests by feature
    organizeTestsByFeature() {
        const integrationDir = path.join(this.testDir, 'integration');
        if (!fs.existsSync(integrationDir)) return;

        const files = fs.readdirSync(integrationDir);
        const testsByFeature = {};

        // Group tests by feature
        files.forEach(file => {
            if (file.endsWith('.test.js')) {
                const featureName = file.split('-')[0];
                if (!testsByFeature[featureName]) {
                    testsByFeature[featureName] = [];
                }
                testsByFeature[featureName].push(file);
            }
        });

        // Create feature subdirectories for features with multiple tests
        Object.entries(testsByFeature).forEach(([feature, tests]) => {
            if (tests.length > 3 && !['api', 'database', 'authentication'].includes(feature)) {
                const featureDir = path.join(integrationDir, feature);
                
                if (!fs.existsSync(featureDir)) {
                    fs.mkdirSync(featureDir);
                    this.changes.push(`Created feature directory: integration/${feature}/`);
                    
                    // Move related test files
                    tests.forEach(testFile => {
                        const oldPath = path.join(integrationDir, testFile);
                        const newPath = path.join(featureDir, testFile);
                        
                        if (fs.existsSync(oldPath)) {
                            fs.renameSync(oldPath, newPath);
                            this.changes.push(`Moved test: ${testFile} → ${feature}/${testFile}`);
                        }
                    });
                }
            }
        });
    }

    // Consolidate test utility functions
    consolidateTestUtilities() {
        const utilsDir = path.join(this.testDir, 'utils');
        const integrationDir = path.join(this.testDir, 'integration');
        
        if (!fs.existsSync(utilsDir)) {
            fs.mkdirSync(utilsDir);
            this.changes.push('Created test utils directory');
        }

        // Check for any utility functions scattered in integration tests
        if (fs.existsSync(integrationDir)) {
            const files = fs.readdirSync(integrationDir);
            
            files.forEach(file => {
                if (file.includes('util') || file.includes('helper')) {
                    const oldPath = path.join(integrationDir, file);
                    const newPath = path.join(utilsDir, file);
                    
                    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
                        fs.renameSync(oldPath, newPath);
                        this.changes.push(`Moved utility: ${file} → utils/${file}`);
                    }
                }
            });
        }
    }

    // Update test README if it exists
    updateTestDocumentation() {
        const readmePath = path.join(this.testDir, 'README.md');
        
        if (fs.existsSync(readmePath)) {
            const content = fs.readFileSync(readmePath, 'utf8');
            
            // Add a section about the new structure if not present
            const newStructureSection = `
## Test Structure

- \`integration/\` - Integration tests that test multiple components together
  - Feature-specific subdirectories for complex features (e.g., \`leave/\`, \`departments/\`)
- \`unit/\` - Unit tests for individual functions and modules
- \`utils/\` - Shared test utilities and helper functions
- \`repositories/\` - Tests for repository pattern implementations

## Naming Conventions

- Test files use kebab-case: \`feature-name.test.js\`
- Test descriptions are clear and descriptive
- Group related tests using \`describe\` blocks
`;

            if (!content.includes('## Test Structure')) {
                const updatedContent = content + newStructureSection;
                fs.writeFileSync(readmePath, updatedContent);
                this.changes.push('Updated test README with structure documentation');
            }
        }
    }

    runRefactoring() {
        console.log('=== Test 2 - Refactor Phase: Test Structure Improvement ===\n');
        
        this.standardizeTestFileNames();
        this.organizeTestsByFeature();
        this.consolidateTestUtilities();
        this.updateTestDocumentation();

        console.log(`Made ${this.changes.length} improvements:\n`);
        
        this.changes.forEach((change, index) => {
            console.log(`${index + 1}. ${change}`);
        });

        if (this.changes.length === 0) {
            console.log('✅ Test structure is already well organized');
        } else {
            console.log(`\n✅ Test structure refactoring complete`);
        }
    }
}

// Run the refactoring
const refactorer = new TestStructureRefactorer();
refactorer.runRefactoring();