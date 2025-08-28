# XLSX Migration Plan

## Current Status Analysis

### Current Version
- Using xlsx version 0.18.5 (published 3 years ago)
- Contains high-severity vulnerabilities (GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9)
- No patched versions available on npm

### Usage in Project
- Frontend: `src/pages/DashboardPage.tsx` (export functionality)
- Backend: `server/src/utils/excelParser.ts` (file processing)
- Tests: Multiple test files with mocks
- Scripts: Test file generation scripts

## Migration Options

### Option 1: Update to Patched Version (If Available)
**Status**: Not available on npm
**Pros**: Minimal code changes required
**Cons**: Not available, package appears unmaintained

### Option 2: Switch to exceljs
**Status**: Actively maintained alternative
**Pros**: 
- Regular updates and security patches
- Better performance
- More features
- Active community
**Cons**: 
- Requires code rewrite
- Different API

### Option 3: Switch to node-xlsx
**Status**: Simpler alternative
**Pros**: 
- Lightweight
- Similar API to xlsx
**Cons**: 
- Less features than exceljs
- May have similar maintenance issues

## Recommended Approach: Migrate to exceljs

### Rationale
1. exceljs is actively maintained
2. Better long-term support and security
3. More comprehensive feature set
4. Strong community adoption

## Migration Steps

### Phase 1: Preparation
1. [ ] Create backup tag: `git tag backup/before-xlsx-migration`
2. [ ] Install exceljs: `npm install exceljs`
3. [ ] Install @types/exceljs if needed: `npm install --save-dev @types/exceljs`

### Phase 2: Backend Migration (server/src/utils/excelParser.ts)

#### Current Implementation:
```typescript
import * as XLSX from 'xlsx';

export const processExcelFile = async (
  fileBuffer: Buffer,
  fileName: string,
  containerName: string,
  userId: string
): Promise<{
  success: boolean;
  count: number;
  error?: string;
  data?: Record<string, unknown>[];
  headers?: string[];
  rowCount?: number;
  columnCount?: number;
}> => {
  try {
    // Parse the Excel file
    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd',
      });
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: 'Invalid Excel file format'
      };
    }

    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        count: 0,
        error: 'No worksheets found in the Excel file'
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    });
    
    // ... rest of implementation
  }
}
```

#### New Implementation with exceljs:
```typescript
import { Workbook } from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

export const processExcelFile = async (
  fileBuffer: Buffer,
  fileName: string,
  containerName: string,
  userId: string
): Promise<{
  success: boolean;
  count: number;
  error?: string;
  data?: Record<string, unknown>[];
  headers?: string[];
  rowCount?: number;
  columnCount?: number;
}> => {
  try {
    // Parse the Excel file
    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(fileBuffer);
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: 'Invalid Excel file format'
      };
    }

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return {
        success: false,
        count: 0,
        error: 'No worksheets found in the Excel file'
      };
    }

    // Extract data
    const rows = worksheet.getSheetValues() as (string | number | Date)[][];
    if (rows.length <= 1) {
      return {
        success: false,
        count: 0,
        error: 'No data rows found in the Excel file'
      };
    }

    // Extract headers (first row)
    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    // Process data rows
    const processedData = dataRows.map((row, index) => {
      const record: Record<string, unknown> = {
        id: uuidv4(),
        _partitionKey: userId,
        fileName,
        containerName,
        rowNumber: index + 2,
        uploadDate: new Date().toISOString(),
        status: 'pending',
      };

      // Map each cell to its header
      headers.forEach((header, colIndex) => {
        if (header) {
          record[header] = row[colIndex] !== undefined ? row[colIndex] : null;
        }
      });

      return record;
    });

    return {
      success: true,
      count: processedData.length,
      data: processedData,
      headers,
      rowCount: dataRows.length,
      columnCount: headers.length,
    };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to process Excel file'
    };
  }
}
```

### Phase 3: Frontend Migration (src/pages/DashboardPage.tsx)

#### Current Implementation:
```typescript
import * as XLSX from 'xlsx';

// Export functionality
const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
```

#### New Implementation with exceljs:
```typescript
import { Workbook } from 'exceljs';

// Export functionality
const exportToExcel = async (data: any[], fileName: string) => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
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
  
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
```

### Phase 4: Update Test Files

#### Current Test Mock:
```typescript
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    decode_range: vi.fn(),
    encode_cell: vi.fn()
  }
}));
```

#### New Test Mock for exceljs:
```typescript
vi.mock('exceljs', () => {
  return {
    Workbook: vi.fn().mockImplementation(() => {
      return {
        xlsx: {
          load: vi.fn().mockResolvedValue(undefined)
        },
        worksheets: [{
          getSheetValues: vi.fn().mockReturnValue([
            ['Header1', 'Header2', 'Header3'],
            ['Value1A', 'Value1B', 'Value1C'],
            ['Value2A', 'Value2B', 'Value2C'],
          ])
        }]
      };
    })
  };
});
```

### Phase 5: Update Scripts

#### Current Script:
```javascript
import XLSX from 'xlsx';

const createTestFile = () => {
  const worksheet = XLSX.utils.json_to_sheet([
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 }
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, 'test.xlsx');
};
```

#### New Script with exceljs:
```javascript
import { Workbook } from 'exceljs';

const createTestFile = async () => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
  // Add headers
  worksheet.addRow(['name', 'age']);
  
  // Add data
  worksheet.addRow(['John', 30]);
  worksheet.addRow(['Jane', 25]);
  
  // Save file
  await workbook.xlsx.writeFile('test.xlsx');
};
```

## Testing Plan

### 1. Unit Tests
- [ ] Update excelParser.test.ts to use exceljs mocks
- [ ] Verify all existing test cases pass
- [ ] Add new test cases for exceljs-specific functionality

### 2. Integration Tests
- [ ] Test file upload with various Excel formats
- [ ] Verify data processing accuracy
- [ ] Test export functionality

### 3. Manual Testing
- [ ] Upload different Excel files (xls, xlsx)
- [ ] Verify data is processed correctly
- [ ] Test export functionality
- [ ] Check error handling

## Rollback Plan
If issues are encountered:
1. [ ] Revert package.json changes
2. [ ] Restore original excelParser.ts
3. [ ] Restore original DashboardPage.tsx
4. [ ] Restore original test files
5. [ ] Run npm install

## Timeline Estimate
1. Preparation: 1 day
2. Backend migration: 2 days
3. Frontend migration: 1 day
4. Testing and bug fixes: 2 days
5. Documentation and deployment: 1 day
**Total: 7 days**