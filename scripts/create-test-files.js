import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Create test data
const testData = [
  { Name: 'John', Age: 30, City: 'New York' },
  { Name: 'Jane', Age: 25, City: 'Los Angeles' },
  { Name: 'Bob', Age: 40, City: 'Chicago' },
  { Name: 'Alice', Age: 35, City: 'Houston' },
  { Name: 'Charlie', Age: 28, City: 'Phoenix' }
];

// Create CSV file
const csvContent = [
  Object.keys(testData[0]).join(','),
  ...testData.map(row => Object.values(row).join(','))
].join('\n');

writeFileSync('test-upload.csv', csvContent);
console.log('Created test-upload.csv');

// Create Excel file
const worksheet = XLSX.utils.json_to_sheet(testData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Data');
XLSX.writeFile(workbook, 'test-upload.xlsx');
console.log('Created test-upload.xlsx');

console.log('Test files created successfully!');
