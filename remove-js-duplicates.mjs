import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan for .js/.ts files
const directoriesToScan = ['src', 'server'];

const files = [];

// Recursively find all .js and .ts files
async function findFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await findFiles(fullPath);
    } else if (entry.isFile() && (
      entry.name.endsWith('.js') || 
      entry.name.endsWith('.jsx') || 
      entry.name.endsWith('.ts') || 
      entry.name.endsWith('.tsx')
    )) {
      const baseName = entry.name.replace(/\.[^.]+$/, '');
      const ext = path.extname(entry.name);
      const relPath = path.relative(process.cwd(), fullPath);
      
      files.push({
        baseName,
        ext,
        fullPath,
        relPath,
        dir: path.dirname(fullPath)
      });
    }
  }
}

// Group files by their base name
function groupFiles() {
  const fileGroups = {};

  for (const file of files) {
    const key = path.join(file.dir, file.baseName);
    if (!fileGroups[key]) {
      fileGroups[key] = [];
    }
    fileGroups[key].push(file);
  }

  return fileGroups;
}

// Find files that have both .js and .ts versions
function findDuplicates(fileGroups) {
  const duplicates = [];

  for (const [key, group] of Object.entries(fileGroups)) {
    const hasJs = group.some(f => f.ext === '.js' || f.ext === '.jsx');
    const hasTs = group.some(f => f.ext === '.ts' || f.ext === '.tsx');
    
    if (hasJs && hasTs) {
      duplicates.push({
        baseName: path.basename(key),
        dir: path.dirname(key),
        files: group
      });
    }
  }

  return duplicates;
}

async function main() {
  try {
    console.log('Scanning for duplicate .js/.ts files...');
    
    // Scan all specified directories
    for (const dir of directoriesToScan) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        await findFiles(fullPath);
      } else {
        console.log(`Warning: Directory '${dir}' does not exist, skipping.`);
      }
    }
    
    const fileGroups = groupFiles();
    const duplicates = findDuplicates(fileGroups);
    
    if (duplicates.length === 0) {
      console.log('No duplicate .js/.ts files found.');
      return;
    }

    console.log('\nFound duplicate .js/.ts files:');
    const toRemove = [];

    for (const dup of duplicates) {
      const jsFiles = dup.files.filter(f => f.ext === '.js' || f.ext === '.jsx');
      const tsFiles = dup.files.filter(f => f.ext === '.ts' || f.ext === '.tsx');
      
      console.log(`\n${path.join(dup.dir, dup.baseName)}`);
      console.log('  JavaScript files:');
      jsFiles.forEach(f => console.log(`    - ${f.relPath}`));
      console.log('  TypeScript files:');
      tsFiles.forEach(f => console.log(`    - ${f.relPath}`));
      
      // Only remove .js files that have a direct .ts equivalent
      for (const jsFile of jsFiles) {
        const tsFile = tsFiles.find(f => 
          f.relPath === jsFile.relPath.replace(/\.jsx?$/, '.ts') ||
          f.relPath === jsFile.relPath.replace(/\.jsx?$/, '.tsx')
        );
        
        if (tsFile) {
          toRemove.push(jsFile);
        }
      }
    }

    if (toRemove.length === 0) {
      console.log('\nNo duplicate .js files to remove.');
      return;
    }

    console.log('\nThe following files will be removed (they have TypeScript equivalents):');
    toRemove.forEach(f => console.log(`- ${f.relPath}`));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    try {
      const answer = await rl.question('\nProceed with removal? (y/N) ');
      
      if (answer.toLowerCase() === 'y') {
        console.log('\nRemoving files...');
        let removed = 0;
        
        for (const file of toRemove) {
          try {
            fs.unlinkSync(file.fullPath);
            console.log(`✓ Removed: ${file.relPath}`);
            removed++;
          } catch (err) {
            console.error(`✗ Error removing ${file.relPath}: ${err.message}`);
          }
        }
        
        console.log(`\nRemoved ${removed} out of ${toRemove.length} files.`);
      } else {
        console.log('\nOperation cancelled.');
      }
    } finally {
      rl.close();
    }
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main();
