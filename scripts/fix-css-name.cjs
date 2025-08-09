const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '../dist');
const assetsPath = path.resolve(distPath, 'assets');
const htmlPath = path.resolve(distPath, 'index.html');

const oldCssFileName = 'main.W1Mdea1icss';
const newCssFileName = 'main.css';

const oldCssFilePath = path.resolve(assetsPath, oldCssFileName);
const newCssFilePath = path.resolve(assetsPath, newCssFileName);

console.log(`Attempting to rename ${oldCssFilePath} to ${newCssFilePath}`);

try {
  if (fs.existsSync(oldCssFilePath)) {
    fs.renameSync(oldCssFilePath, newCssFilePath);
    console.log('CSS file renamed successfully.');

    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const oldRef = `/assets/${oldCssFileName}`;
    const newRef = `/assets/${newCssFileName}`;

    if (htmlContent.includes(oldRef)) {
      htmlContent = htmlContent.replace(oldRef, newRef);
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log('index.html updated successfully.');
    } else {
      console.warn(`Reference to ${oldRef} not found in index.html. Skipping HTML update.`);
    }
  } else {
    console.warn(`CSS file ${oldCssFilePath} not found. Skipping rename and HTML update.`);
  }
} catch (error) {
  console.error('Error during post-build CSS fix:', error);
  process.exit(1); // Exit with error code
}
