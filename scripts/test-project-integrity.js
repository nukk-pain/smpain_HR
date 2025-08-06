#!/usr/bin/env node

/**
 * Test 3 - Red Phase: Project Integrity Verification Test
 * This test should PASS initially to ensure project still works after cleanup
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ProjectIntegrityTest {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.issues = [];
        this.successes = [];
    }

    // Check all import/require statements are valid
    async checkImportsAndRequires() {
        console.log('Checking import/require statements...');
        
        const jsFiles = await this.findJavaScriptFiles();
        
        for (const filePath of jsFiles) {
            await this.validateFileImports(filePath);
        }
        
        this.successes.push(`Validated imports in ${jsFiles.length} JavaScript files`);
    }

    // Find all JavaScript files in the project
    async findJavaScriptFiles() {
        const files = [];
        const searchDirs = [
            path.join(this.projectRoot, 'backend'),
            path.join(this.projectRoot, 'frontend', 'src'),
            path.join(this.projectRoot, 'scripts')
        ];

        for (const dir of searchDirs) {
            if (fs.existsSync(dir)) {
                const found = await this.findFilesRecursive(dir, /\.(js|ts|tsx)$/);
                files.push(...found);
            }
        }

        return files.filter(file => !file.includes('node_modules'));
    }

    // Recursively find files matching pattern
    async findFilesRecursive(dir, pattern) {
        const files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory() && item !== 'node_modules') {
                    const subFiles = await this.findFilesRecursive(itemPath, pattern);
                    files.push(...subFiles);
                } else if (stat.isFile() && pattern.test(item)) {
                    files.push(itemPath);
                }
            }
        } catch (error) {
            // Skip directories that can't be read
        }
        
        return files;
    }

    // Validate imports in a single file
    async validateFileImports(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check require statements
            const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
            let match;
            
            while ((match = requireRegex.exec(content)) !== null) {
                const importPath = match[1];
                
                // Skip node_modules imports
                if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                    continue;
                }
                
                await this.validateLocalImport(filePath, importPath);
            }
            
            // Check ES6 import statements
            const importRegex = /from\s+['"`]([^'"`]+)['"`]/g;
            
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                
                // Skip node_modules imports
                if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                    continue;
                }
                
                await this.validateLocalImport(filePath, importPath);
            }
        } catch (error) {
            this.issues.push({
                type: 'file_read_error',
                file: path.relative(this.projectRoot, filePath),
                message: `Cannot read file: ${error.message}`
            });
        }
    }

    // Validate a local import path exists
    async validateLocalImport(fromFile, importPath) {
        const resolvedPath = path.resolve(path.dirname(fromFile), importPath);
        const possibleFiles = [
            resolvedPath,
            resolvedPath + '.js',
            resolvedPath + '.ts',
            resolvedPath + '.tsx',
            path.join(resolvedPath, 'index.js'),
            path.join(resolvedPath, 'index.ts')
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
                file: path.relative(this.projectRoot, fromFile),
                importPath,
                message: `Broken import in ${path.basename(fromFile)}: ${importPath}`
            });
        }
    }

    // Check package.json dependencies
    async checkPackageDependencies() {
        console.log('Checking package.json dependencies...');
        
        const packagePaths = [
            path.join(this.projectRoot, 'package.json'),
            path.join(this.projectRoot, 'backend', 'package.json'),
            path.join(this.projectRoot, 'frontend', 'package.json')
        ];

        for (const packagePath of packagePaths) {
            if (fs.existsSync(packagePath)) {
                await this.validatePackageFile(packagePath);
            }
        }
        
        this.successes.push('Validated package.json files');
    }

    // Validate a package.json file
    async validatePackageFile(packagePath) {
        try {
            const content = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const packageDir = path.dirname(packagePath);
            
            // Check if node_modules exists
            const nodeModulesPath = path.join(packageDir, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                this.issues.push({
                    type: 'missing_node_modules',
                    file: path.relative(this.projectRoot, packagePath),
                    message: `node_modules not found for ${path.relative(this.projectRoot, packagePath)}`
                });
            }
        } catch (error) {
            this.issues.push({
                type: 'package_json_error',
                file: path.relative(this.projectRoot, packagePath),
                message: `Invalid package.json: ${error.message}`
            });
        }
    }

    // Test build processes
    async testBuildProcesses() {
        console.log('Testing build processes...');
        
        await this.testFrontendBuild();
        await this.testBackendStart();
    }

    // Test frontend build
    async testFrontendBuild() {
        const frontendDir = path.join(this.projectRoot, 'frontend');
        
        if (!fs.existsSync(frontendDir)) {
            this.issues.push({
                type: 'missing_frontend',
                message: 'Frontend directory not found'
            });
            return;
        }

        try {
            console.log('Running frontend build test...');
            const { stdout, stderr } = await execAsync('npm run build', {
                cwd: frontendDir,
                timeout: 120000 // 2 minute timeout
            });
            
            this.successes.push('Frontend build test passed');
        } catch (error) {
            this.issues.push({
                type: 'frontend_build_failure',
                message: `Frontend build failed: ${error.message}`
            });
        }
    }

    // Test backend startup
    async testBackendStart() {
        const backendDir = path.join(this.projectRoot, 'backend');
        
        if (!fs.existsSync(backendDir)) {
            this.issues.push({
                type: 'missing_backend',
                message: 'Backend directory not found'
            });
            return;
        }

        try {
            console.log('Testing backend startup (syntax check)...');
            // Just do a syntax check instead of full start
            const { stdout, stderr } = await execAsync('node -c server.js', {
                cwd: backendDir,
                timeout: 10000 // 10 second timeout
            });
            
            this.successes.push('Backend syntax check passed');
        } catch (error) {
            this.issues.push({
                type: 'backend_syntax_error',
                message: `Backend syntax check failed: ${error.message}`
            });
        }
    }

    // Run all integrity tests
    async runTest() {
        console.log('=== Test 3 - Red Phase: Project Integrity Verification ===\n');
        
        try {
            await this.checkImportsAndRequires();
            await this.checkPackageDependencies();
            await this.testBuildProcesses();

            console.log(`\nResults:`);
            console.log(`✅ Successes: ${this.successes.length}`);
            this.successes.forEach((success, index) => {
                console.log(`   ${index + 1}. ${success}`);
            });

            if (this.issues.length > 0) {
                console.log(`\n❌ Issues found: ${this.issues.length}`);
                this.issues.forEach((issue, index) => {
                    console.log(`   ${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
                });
                
                console.log(`\n❌ TEST FAILED: Found ${this.issues.length} integrity issues`);
                console.log('Project integrity compromised - need to fix issues.');
                process.exit(1);
            } else {
                console.log(`\n✅ TEST PASSED: Project integrity maintained`);
                console.log('All systems operational after cleanup.');
                process.exit(0);
            }
        } catch (error) {
            console.log(`\n❌ TEST ERROR: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run the test
const test = new ProjectIntegrityTest();
test.runTest();