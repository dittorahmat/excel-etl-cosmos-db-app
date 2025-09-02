#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyDist() {
  try {
    const sourceDir = path.join(__dirname, '../dist');
    const targetDir = path.join(__dirname, '../server/dist/public');
    
    console.log(`Copying files from ${sourceDir} to ${targetDir}...`);
    
    // Ensure target directory exists
    await fs.ensureDir(targetDir);
    
    // Copy all files from dist to server/dist/public
    await fs.copy(sourceDir, targetDir, {
      overwrite: true,
      preserveTimestamps: true,
    });
    
    console.log('Successfully copied build files to server/dist/public');
  } catch (error) {
    console.error('Error copying build files:', error);
    process.exit(1);
  }
}

copyDist();
