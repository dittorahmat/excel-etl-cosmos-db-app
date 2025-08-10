const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '../dist');
const htmlPath = path.resolve(distPath, 'index.html');

const reactCdnScript = '<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>';
const reactDomCdnScript = '<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>';

try {
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Find the first <script type="module" ...> tag
  const firstModuleScriptTag = '<script type="module"';
  const firstModuleScriptIndex = htmlContent.indexOf(firstModuleScriptTag);

  if (firstModuleScriptIndex !== -1) {
    // Insert the CDN scripts before the first module script tag
    const newHtmlContent = htmlContent.substring(0, firstModuleScriptIndex) + 
                           `\n    <!-- React and ReactDOM from CDN -->\n    ${reactCdnScript}\n    ${reactDomCdnScript}\n` + 
                           htmlContent.substring(firstModuleScriptIndex);
    fs.writeFileSync(htmlPath, newHtmlContent, 'utf8');
    console.log('React and ReactDOM CDN scripts added to index.html successfully.');
  } else {
    console.error('Error: <script type="module"> tag not found in index.html.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error adding CDN scripts to index.html:', error);
  process.exit(1);
}