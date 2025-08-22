const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '../dist');
const assetsPath = path.resolve(distPath, 'assets');
const htmlPath = path.resolve(distPath, 'index.html');

// Find the main CSS file dynamically
let oldCssFileName = null;
let newCssFileName = 'main.css';

try {
  const files = fs.readdirSync(assetsPath);
  console.log('Files in assets directory:', files); // Debug log

  // Match files that contain 'main' and end with '.css'
  // This handles various naming patterns like 'main.css', 'main-abc123.css', etc.
  const cssFiles = files.filter(file =>
    file.includes('main') && file.endsWith('.css')
  );
  console.log('Filtered CSS files (flexible pattern):', cssFiles); // Debug log

  if (cssFiles.length === 0) {
    console.warn('No main CSS file (starting with main. and ending with css/icss) found in assets directory. Skipping rename and HTML update.');
    process.exit(0); // Exit successfully as this might be expected in some builds
  }

  if (cssFiles.length > 1) {
    console.warn('Multiple main CSS files found. Using the first one.');
  }

  oldCssFileName = cssFiles[0]; // Use the first matching file

  const oldCssFilePath = path.resolve(assetsPath, oldCssFileName);
  const newCssFilePath = path.resolve(assetsPath, newCssFileName);

  console.log(`Attempting to rename ${oldCssFilePath} to ${newCssFilePath}`);

  if (fs.existsSync(oldCssFilePath)) {
    fs.renameSync(oldCssFilePath, newCssFilePath);
    console.log('CSS file renamed successfully.');

    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const oldRef = `/assets/${oldCssFileName}`;
    const newRef = `/assets/${newCssFileName}`;

    // Escape special regex characters in the oldRef for safe replacement
    const escapedOldRef = oldRef.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); // $& means the whole matched string
    const regex = new RegExp(escapedOldRef, 'g');

    if (htmlContent.includes(oldRef)) {
      htmlContent = htmlContent.replace(regex, newRef);
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log('index.html updated successfully.');
    } else {
      console.warn(`Reference to ${oldRef} not found in index.html. Skipping HTML update.`);
    }
  } else {
    console.warn(`CSS file ${oldCssFilePath} not found (race condition?). Skipping rename and HTML update.`);
  }
} catch (error) {
  console.error('Error during post-build CSS fix:', error);
  process.exit(1); // Exit with error code
}