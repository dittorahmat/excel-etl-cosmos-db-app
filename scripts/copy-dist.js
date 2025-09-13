#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple copy function using built-in fs
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dest, { recursive: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyDist() {
  try {
    const sourceDir = path.join(__dirname, '../dist');
    const targetDir = path.join(__dirname, '../server/dist/public');
    
    console.log(`Copying files from ${sourceDir} to ${targetDir}...`);
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy all files from dist to server/dist/public
    if (fs.existsSync(sourceDir)) {
      copyDir(sourceDir, targetDir);
    }
    
    console.log('Successfully copied build files to server/dist/public');
  } catch (error) {
    console.error('Error copying build files:', error);
    process.exit(1);
  }
}

copyDist();
