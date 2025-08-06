#!/usr/bin/env node

/**
 * Test 1 - Red Phase: Identify unnecessary document files
 * This test should FAIL initially as it detects unnecessary files
 */

const fs = require('fs');
const path = require('path');

class UnnecessaryDocsTest {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.issues = [];
    }

    // Check for duplicate README files
    checkDuplicateReadmes() {
        const readmeFiles = [];
        const files = fs.readdirSync(this.projectRoot);
        
        files.forEach(file => {
            if (file.toLowerCase().includes('readme')) {
                readmeFiles.push(file);
            }
        });

        if (readmeFiles.length > 1) {
            this.issues.push({
                type: 'duplicate_readme',
                files: readmeFiles,
                message: `Found ${readmeFiles.length} README files: ${readmeFiles.join(', ')}`
            });
        }
    }

    // Check for temporary markdown files
    checkTemporaryMarkdownFiles() {
        const tempPatterns = [
            /temp.*\.md$/i,
            /.*temp\.md$/i,
            /notes?.*\.md$/i,
            /test.*\.md$/i,
            /.*-test\.md$/i,
            /todo\.md$/i,
            /create_users\.md$/i,
            /db_check\.md$/i,
            /email\.md$/i,
            /secret\.md$/i,
            /permission-test-results\.md$/i,
            /direct-url-test\.md$/i,
            /browser-navigation-test\.md$/i
        ];

        const files = fs.readdirSync(this.projectRoot);
        
        files.forEach(file => {
            if (file.endsWith('.md')) {
                tempPatterns.forEach(pattern => {
                    if (pattern.test(file)) {
                        this.issues.push({
                            type: 'temporary_file',
                            file: file,
                            message: `Found temporary document file: ${file}`
                        });
                    }
                });
            }
        });
    }

    // Check for migration-related temporary documents
    checkMigrationDocs() {
        const migrationPatterns = [
            /migration.*\.md$/i,
            /.*migration.*\.md$/i,
            /authentication.*\.md$/i,
            /deployment-status\.md$/i
        ];

        const files = fs.readdirSync(this.projectRoot);
        
        files.forEach(file => {
            if (file.endsWith('.md')) {
                migrationPatterns.forEach(pattern => {
                    if (pattern.test(file)) {
                        this.issues.push({
                            type: 'migration_temp',
                            file: file,
                            message: `Found migration/temporary document: ${file}`
                        });
                    }
                });
            }
        });
    }

    // Check for plan files that should be consolidated
    checkPlanFiles() {
        const planFiles = [];
        const files = fs.readdirSync(this.projectRoot);
        
        files.forEach(file => {
            if (file.includes('plan') && file.endsWith('.md') && file !== 'plan.md') {
                planFiles.push(file);
            }
        });

        if (planFiles.length > 0) {
            this.issues.push({
                type: 'duplicate_plans',
                files: planFiles,
                message: `Found duplicate plan files: ${planFiles.join(', ')}`
            });
        }
    }

    // Check for implementation summary files
    checkImplementationSummaries() {
        const summaryFiles = [];
        const files = fs.readdirSync(this.projectRoot);
        
        files.forEach(file => {
            if (file.includes('summary') && file.endsWith('.md')) {
                summaryFiles.push(file);
            }
        });

        if (summaryFiles.length > 0) {
            this.issues.push({
                type: 'implementation_summaries',
                files: summaryFiles,
                message: `Found implementation summary files: ${summaryFiles.join(', ')}`
            });
        }
    }

    runTest() {
        console.log('=== Test 1 - Red Phase: Unnecessary Document Files Test ===\n');
        
        this.checkDuplicateReadmes();
        this.checkTemporaryMarkdownFiles();
        this.checkMigrationDocs();
        this.checkPlanFiles();
        this.checkImplementationSummaries();

        console.log(`Found ${this.issues.length} issues:\n`);
        
        this.issues.forEach((issue, index) => {
            console.log(`${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
        });

        // Test should FAIL if issues are found (Red phase)
        if (this.issues.length > 0) {
            console.log(`\n❌ TEST FAILED: Found ${this.issues.length} unnecessary document files`);
            console.log('This failure is EXPECTED in the Red phase of TDD.');
            process.exit(1);
        } else {
            console.log('\n✅ TEST PASSED: No unnecessary document files found');
            process.exit(0);
        }
    }
}

// Run the test
const test = new UnnecessaryDocsTest();
test.runTest();