import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of files to update
const filesToUpdate = [
  'src/App.js',
  'src/App.tsx',
  'src/components/layout/Navbar.jsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/auth/ProtectedRoute.js',
  'src/components/auth/LoginButton.tsx',
  'src/components/auth/LoginButton.js',
  'src/components/auth/ProtectedRoute.tsx',
  'src/components/layout/Sidebar.js',
  'src/__tests__/auth/AuthProvider.test.tsx.new',
  'src/__tests__/auth/AuthProvider.test.tsx',
  'src/test-utils.tsx',
  'src/components/layout/Navbar.tsx'
];

// Process each file
filesToUpdate.forEach(filePath => {
  try {
    const fullPath = join(process.cwd(), filePath);
    let content = readFileSync(fullPath, 'utf8');
    
    // Update import paths
    content = content.replace(
      /from ['"](.*?)\/auth\/AuthProvider['"]/g,
      (match, p1) => `from '${p1}/auth/useAuth'`
    );
    
    // Update AuthProvider import if it exists
    if (content.includes("from './auth/useAuth'")) {
      content = content.replace(
        "import { AuthProvider } from './auth/useAuth';",
        "import { AuthProvider } from './auth/AuthProvider';"
      );
    }
    
    writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Import updates complete!');
