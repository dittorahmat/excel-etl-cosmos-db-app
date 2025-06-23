const fs = require('fs');
const path = require('path');

// Find all .js and .ts files in the src directory
const srcDir = path.join(__dirname, 'src');
const files = [];

// Recursively find all .js and .ts files
function findFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      findFiles(fullPath);
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

findFiles(srcDir);

// Group files by their base name
const fileGroups = {};

for (const file of files) {
  const key = path.join(file.dir, file.baseName);
  if (!fileGroups[key]) {
    fileGroups[key] = [];
  }
  fileGroups[key].push(file);
}

// Find files that have both .js and .ts versions
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

// Process duplicates
console.log('Found duplicate .js/.ts files:');
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

// Ask for confirmation before removing files
if (toRemove.length > 0) {
  console.log('\nThe following files will be removed (they have TypeScript equivalents):');
  toRemove.forEach(f => console.log(`- ${f.relPath}`));
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\nProceed with removal? (y/N) ', (answer) => {
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
    
    rl.close();
  });
} else {
  console.log('\nNo duplicate .js/.ts files to remove.');
}
