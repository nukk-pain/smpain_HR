#!/usr/bin/env node

/**
 * Test 1 - Refactor Phase: Improve document structure and organization
 */

const fs = require('fs');
const path = require('path');

class DocsRefactorer {
    constructor() {
        this.docsDir = path.resolve(__dirname, '../docs');
        this.changes = [];
    }

    // Consolidate deployment files
    consolidateDeploymentFiles() {
        const deploymentDir = path.join(this.docsDir, 'deployment');
        
        // Move root-level deployment files to deployment directory
        const rootDeploymentFiles = [
            'CLOUD_RUN_DEPLOYMENT.md',
            'MONGODB_ATLAS_SETUP.md', 
            'VERCEL_DEPLOYMENT.md'
        ];

        rootDeploymentFiles.forEach(file => {
            const srcPath = path.join(this.docsDir, file);
            const destPath = path.join(deploymentDir, file.toLowerCase().replace(/_/g, '-'));
            
            if (fs.existsSync(srcPath)) {
                // Check for duplicates in deployment dir
                const existing = fs.readdirSync(deploymentDir).find(f => 
                    f.toLowerCase().includes(file.toLowerCase().split('_')[0].toLowerCase())
                );
                
                if (!existing) {
                    fs.renameSync(srcPath, destPath);
                    this.changes.push(`Moved ${file} to deployment/${path.basename(destPath)}`);
                } else {
                    // If duplicate exists, remove the root-level one
                    fs.unlinkSync(srcPath);
                    this.changes.push(`Removed duplicate ${file} (exists in deployment/)`);
                }
            }
        });
    }

    // Consolidate JWT migration files since migration is complete
    consolidateJWTFiles() {
        const deploymentDir = path.join(this.docsDir, 'deployment');
        const jwtFiles = fs.readdirSync(deploymentDir).filter(f => 
            f.includes('jwt') && !f.includes('complete')
        );

        if (jwtFiles.length > 0) {
            // Keep only the complete migration file and test guide
            const keepFiles = ['jwt-migration-complete.md', 'frontend-jwt-test-guide.md'];
            
            jwtFiles.forEach(file => {
                if (!keepFiles.includes(file)) {
                    const filePath = path.join(deploymentDir, file);
                    fs.unlinkSync(filePath);
                    this.changes.push(`Removed obsolete JWT file: ${file}`);
                }
            });
        }
    }

    // Clean up previous plans directory
    cleanupPreviousPlans() {
        const previousPlansDir = path.join(this.docsDir, 'previous_plans');
        if (fs.existsSync(previousPlansDir)) {
            const files = fs.readdirSync(previousPlansDir);
            
            // Keep only the most recent and relevant plans
            const filesToKeep = ['plan1.md', 'plan2.md']; // Keep for historical reference
            
            files.forEach(file => {
                if (!filesToKeep.includes(file)) {
                    const filePath = path.join(previousPlansDir, file);
                    fs.unlinkSync(filePath);
                    this.changes.push(`Removed obsolete plan file: ${file}`);
                }
            });
        }
    }

    // Standardize naming conventions
    standardizeNaming() {
        // Convert all uppercase filenames to lowercase with hyphens
        const directories = [
            this.docsDir,
            path.join(this.docsDir, 'api'),
            path.join(this.docsDir, 'architecture'),
            path.join(this.docsDir, 'development'),
            path.join(this.docsDir, 'setup')
        ];

        directories.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                
                files.forEach(file => {
                    if (file.endsWith('.md') && file !== file.toLowerCase()) {
                        const oldPath = path.join(dir, file);
                        const newPath = path.join(dir, file.toLowerCase().replace(/_/g, '-'));
                        
                        if (!fs.existsSync(newPath)) {
                            fs.renameSync(oldPath, newPath);
                            this.changes.push(`Renamed ${file} to ${path.basename(newPath)}`);
                        }
                    }
                });
            }
        });
    }

    // Remove duplicate environment setup files
    removeDuplicateSetupFiles() {
        const setupDir = path.join(this.docsDir, 'setup');
        const rootEnvironmentFile = path.join(this.docsDir, 'ENVIRONMENT_SETUP.md');
        
        if (fs.existsSync(rootEnvironmentFile) && fs.existsSync(setupDir)) {
            const setupFiles = fs.readdirSync(setupDir);
            const hasDuplicate = setupFiles.some(f => 
                f.toLowerCase().includes('environment')
            );
            
            if (hasDuplicate) {
                fs.unlinkSync(rootEnvironmentFile);
                this.changes.push('Removed duplicate ENVIRONMENT_SETUP.md from root (exists in setup/)');
            }
        }
    }

    runRefactoring() {
        console.log('=== Test 1 - Refactor Phase: Document Structure Improvement ===\n');
        
        this.consolidateDeploymentFiles();
        this.consolidateJWTFiles();
        this.cleanupPreviousPlans();
        this.standardizeNaming();
        this.removeDuplicateSetupFiles();

        console.log(`Made ${this.changes.length} improvements:\n`);
        
        this.changes.forEach((change, index) => {
            console.log(`${index + 1}. ${change}`);
        });

        if (this.changes.length === 0) {
            console.log('✅ Document structure is already well organized');
        } else {
            console.log(`\n✅ Document structure refactoring complete`);
        }
    }
}

// Run the refactoring
const refactorer = new DocsRefactorer();
refactorer.runRefactoring();