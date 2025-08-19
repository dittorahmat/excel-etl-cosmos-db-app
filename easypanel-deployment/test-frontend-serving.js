#!/usr/bin/env node

// Simple test script to verify that the backend server can serve frontend files
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test 1: Check if the frontend directory exists
const frontendPath = path.join(__dirname, 'frontend');
console.log('Testing frontend directory existence...');
if (fs.existsSync(frontendPath)) {
    console.log('✓ Frontend directory exists');
    
    // Test 2: Check if index.html exists
    const indexPath = path.join(frontendPath, 'index.html');
    console.log('Testing index.html existence...');
    if (fs.existsSync(indexPath)) {
        console.log('✓ index.html exists');
        
        // Test 3: Check if assets directory exists
        const assetsPath = path.join(frontendPath, 'assets');
        console.log('Testing assets directory existence...');
        if (fs.existsSync(assetsPath)) {
            console.log('✓ Assets directory exists');
            
            // Test 4: List some files in assets directory
            const files = fs.readdirSync(assetsPath);
            console.log(`✓ Found ${files.length} files in assets directory`);
            
            // Show first few files as examples
            console.log('Sample assets files:');
            files.slice(0, 5).forEach(file => console.log(`  - ${file}`));
        } else {
            console.log('✗ Assets directory does not exist');
        }
    } else {
        console.log('✗ index.html does not exist');
    }
} else {
    console.log('✗ Frontend directory does not exist');
}

console.log('\nTest completed.');
