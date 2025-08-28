import exceljs from 'exceljs';
import { writeFileSync } from 'fs';

const { Workbook } = exceljs;

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

// Create Excel file using exceljs
const workbook = new Workbook();
const worksheet = workbook.addWorksheet('Test Data');

// Add headers
if (testData.length > 0) {
  const headers = Object.keys(testData[0]);
  worksheet.addRow(headers);
  
  // Add data rows
  testData.forEach(item => {
    const row = headers.map(header => item[header]);
    worksheet.addRow(row);
  });
}

// Write to file
const buffer = await workbook.xlsx.writeBuffer();
writeFileSync('test-upload.xlsx', buffer);
console.log('Created test-upload.xlsx');

console.log('Test files created successfully!');
