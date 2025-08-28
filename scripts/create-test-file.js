import exceljs from 'exceljs';
import { writeFileSync } from 'fs';

const { Workbook } = exceljs;

// Create a new workbook and worksheet
const workbook = new Workbook();
const worksheet = workbook.addWorksheet('Sheet1');

// Sample data
const data = [
  { Name: 'John Doe', Email: 'john@example.com', Phone: '123-456-7890' },
  { Name: 'Jane Smith', Email: 'jane@example.com', Phone: '098-765-4321' }
];

// Add headers
if (data.length > 0) {
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => item[header]);
    worksheet.addRow(row);
  });
}

// Write to file
const buffer = await workbook.xlsx.writeBuffer();
writeFileSync('test-upload.xlsx', buffer);

console.log('Created test-upload.xlsx');
