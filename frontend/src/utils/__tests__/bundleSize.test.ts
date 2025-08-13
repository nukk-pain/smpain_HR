/**
 * AI-HEADER
 * intent: Test to verify frontend bundle size remains within acceptable limits for production deployment
 * domain_meaning: Ensures optimal performance by limiting JavaScript bundle size to reasonable thresholds
 * misleading_names: None - clear testing purpose
 * data_contracts: Expects built files in dist directory with specific size limitations
 * PII: None
 * invariants: Bundle size must not exceed defined limits to maintain performance
 * rag_keywords: bundle size, performance, optimization, build, production
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * DomainMeaning: Tests that verify bundle size constraints for production deployment
 * MisleadingNames: None
 * SideEffects: Reads files from filesystem
 * Invariants: Bundle files must exist and be within size limits
 * RAG_Keywords: bundle, size, performance, testing, limits
 * DuplicatePolicy: canonical
 * FunctionIdentity: bundlesize-test-primary
 */
describe('Bundle Size Optimization Tests', () => {
  const DIST_PATH = join(process.cwd(), 'dist');
  const ASSETS_PATH = join(DIST_PATH, 'assets');
  
  // Bundle size limits (in KB)
  const SIZE_LIMITS = {
    // Main application chunk should be under 500KB
    MAIN_CHUNK_LIMIT: 500,
    // Vendor chunks should be under 800KB each
    VENDOR_CHUNK_LIMIT: 800,
    // Feature chunks should be under 300KB each
    FEATURE_CHUNK_LIMIT: 300,
    // Total bundle size should be under 2MB
    TOTAL_BUNDLE_LIMIT: 2048,
    // Individual asset files should be under 1MB
    ASSET_FILE_LIMIT: 1024
  };

  beforeAll(() => {
    // Ensure dist directory exists
    if (!existsSync(DIST_PATH)) {
      throw new Error(
        'Build directory not found. Please run "npm run build" before running bundle size tests.'
      );
    }
  });

  it('should have main application chunk under size limit', () => {
    const files = readdirSync(ASSETS_PATH);
    const mainChunks = files.filter(file => 
      file.includes('index') && file.endsWith('.js') && !file.includes('.map')
    );

    expect(mainChunks.length).toBeGreaterThan(0);

    mainChunks.forEach(chunk => {
      const chunkPath = join(ASSETS_PATH, chunk);
      const stats = statSync(chunkPath);
      const sizeInKB = Math.round(stats.size / 1024);
      
      expect(sizeInKB).toBeLessThanOrEqual(SIZE_LIMITS.MAIN_CHUNK_LIMIT);
      console.log(`✅ Main chunk ${chunk}: ${sizeInKB}KB (limit: ${SIZE_LIMITS.MAIN_CHUNK_LIMIT}KB)`);
    });
  });

  it('should have vendor chunks under size limit', () => {
    const files = readdirSync(ASSETS_PATH);
    const vendorChunks = files.filter(file => 
      (file.includes('vendor') || file.includes('react') || file.includes('mui')) && 
      file.endsWith('.js') && 
      !file.includes('.map')
    );

    vendorChunks.forEach(chunk => {
      const chunkPath = join(ASSETS_PATH, chunk);
      const stats = statSync(chunkPath);
      const sizeInKB = Math.round(stats.size / 1024);
      
      expect(sizeInKB).toBeLessThanOrEqual(SIZE_LIMITS.VENDOR_CHUNK_LIMIT);
      console.log(`✅ Vendor chunk ${chunk}: ${sizeInKB}KB (limit: ${SIZE_LIMITS.VENDOR_CHUNK_LIMIT}KB)`);
    });
  });

  it('should have feature chunks under size limit', () => {
    const files = readdirSync(ASSETS_PATH);
    const featureChunks = files.filter(file => 
      (file.includes('payroll') || file.includes('user') || file.includes('leave')) && 
      file.endsWith('.js') && 
      !file.includes('.map')
    );

    featureChunks.forEach(chunk => {
      const chunkPath = join(ASSETS_PATH, chunk);
      const stats = statSync(chunkPath);
      const sizeInKB = Math.round(stats.size / 1024);
      
      expect(sizeInKB).toBeLessThanOrEqual(SIZE_LIMITS.FEATURE_CHUNK_LIMIT);
      console.log(`✅ Feature chunk ${chunk}: ${sizeInKB}KB (limit: ${SIZE_LIMITS.FEATURE_CHUNK_LIMIT}KB)`);
    });
  });

  it('should have total bundle size under limit', () => {
    const files = readdirSync(ASSETS_PATH);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('.map'));
    
    let totalSize = 0;
    const fileSizes: { file: string; size: number }[] = [];
    
    jsFiles.forEach(file => {
      const filePath = join(ASSETS_PATH, file);
      const stats = statSync(filePath);
      const sizeInKB = Math.round(stats.size / 1024);
      totalSize += sizeInKB;
      fileSizes.push({ file, size: sizeInKB });
    });

    expect(totalSize).toBeLessThanOrEqual(SIZE_LIMITS.TOTAL_BUNDLE_LIMIT);
    
    console.log('📊 Bundle Size Report:');
    fileSizes
      .sort((a, b) => b.size - a.size)
      .forEach(({ file, size }) => {
        console.log(`  ${file}: ${size}KB`);
      });
    console.log(`📦 Total bundle size: ${totalSize}KB (limit: ${SIZE_LIMITS.TOTAL_BUNDLE_LIMIT}KB)`);
  });

  it('should not have individual files exceeding asset limit', () => {
    const files = readdirSync(ASSETS_PATH);
    const assetFiles = files.filter(file => !file.includes('.map'));

    assetFiles.forEach(file => {
      const filePath = join(ASSETS_PATH, file);
      const stats = statSync(filePath);
      const sizeInKB = Math.round(stats.size / 1024);
      
      expect(sizeInKB).toBeLessThanOrEqual(SIZE_LIMITS.ASSET_FILE_LIMIT);
      
      if (sizeInKB > SIZE_LIMITS.ASSET_FILE_LIMIT * 0.8) { // Warn at 80% of limit
        console.warn(`⚠️  Large file detected: ${file} (${sizeInKB}KB)`);
      }
    });
  });

  it('should have optimal chunk splitting for caching', () => {
    const files = readdirSync(ASSETS_PATH);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('.map'));
    
    // Should have separate vendor chunks for better caching
    const hasReactVendorChunk = jsFiles.some(file => file.includes('react-vendor'));
    const hasMuiCoreChunk = jsFiles.some(file => file.includes('mui-core'));
    
    expect(hasReactVendorChunk).toBe(true);
    expect(hasMuiCoreChunk).toBe(true);
    
    // Should have feature-specific chunks
    const hasPayrollChunk = jsFiles.some(file => file.includes('payroll'));
    const hasUserManagementChunk = jsFiles.some(file => file.includes('user'));
    
    expect(hasPayrollChunk || hasUserManagementChunk).toBe(true);
    
    console.log('✅ Chunk splitting strategy verified');
    console.log(`📄 Total JavaScript files: ${jsFiles.length}`);
  });
});