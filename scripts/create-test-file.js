import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Create a new workbook
const wb = XLSX.utils.book_new();

// Sample data
const data = [
  { Name: 'John Doe', Email: 'john@example.com', Phone: '123-456-7890' },
  { Name: 'Jane Smith', Email: 'jane@example.com', Phone: '098-765-4321' }
];

// Convert data to worksheet
const ws = XLSX.utils.json_to_sheet(data);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Write to file
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync('test-upload.xlsx', buffer);

console.log('Created test-upload.xlsx');
