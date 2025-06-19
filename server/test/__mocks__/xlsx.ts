import { vi } from 'vitest';

// Mock for xlsx library
export const read = vi.fn().mockImplementation((_buffer, _options) => ({
  SheetNames: ['Sheet1'],
  Sheets: {
    Sheet1: {
      '!ref': 'A1:C3',
      A1: { t: 's', v: 'Name' },
      B1: { t: 's', v: 'Age' },
      C1: { t: 's', v: 'Email' },
      A2: { t: 's', v: 'John' },
      B2: { t: 'n', v: 30 },
      C2: { t: 's', v: 'john@example.com' },
      A3: { t: 's', v: 'Jane' },
      B3: { t: 'n', v: 25 },
      C3: { t: 's', v: 'jane@example.com' },
    }
  }
}));

export const utils = {
  decode_range: vi.fn().mockReturnValue({ s: { c: 0, r: 0 }, e: { c: 2, r: 2 } }),
  encode_cell: vi.fn().mockImplementation(({ c, r }) => {
    const col = String.fromCharCode(65 + c); // A, B, C, ...
    return `${col}${r + 1}`;
  }),
  sheet_to_json: vi.fn().mockReturnValue([
    { Name: 'John', Age: 30, Email: 'john@example.com' },
    { Name: 'Jane', Age: 25, Email: 'jane@example.com' }
  ])
};

export default { read, utils };
