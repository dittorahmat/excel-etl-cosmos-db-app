import { faker } from '@faker-js/faker';

// Factory for generating Excel row data
export const excelRowFactory = {
  // Generate a single row of Excel data
  create: (overrides: Partial<Record<string, any>> = {}) => {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      department: faker.commerce.department(),
      salary: faker.number.int({ min: 30000, max: 150000 }),
      hireDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      isActive: faker.datatype.boolean(),
      ...overrides
    };
  },

  // Generate multiple rows of Excel data
  createMany: (count: number, overrides: Partial<Record<string, any>> = {}) => {
    return Array.from({ length: count }, () => excelRowFactory.create(overrides));
  }
};

// Factory for generating user data
export const userFactory = {
  create: (overrides: Partial<{ id: string; name: string; email: string; role: string }> = {}) => {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: faker.helpers.arrayElement(['admin', 'user', 'viewer']),
      createdAt: faker.date.past().toISOString(),
      lastLogin: faker.date.recent().toISOString(),
      ...overrides
    };
  },

  createMany: (count: number, overrides: Partial<{ id: string; name: string; email: string; role: string }> = {}) => {
    return Array.from({ length: count }, () => userFactory.create(overrides));
  }
};

// Factory for generating file metadata
export const fileMetadataFactory = {
  create: (overrides: Partial<{ 
    id: string; 
    name: string; 
    size: number; 
    type: string; 
    uploadedAt: string;
    status: string;
    rowCount: number;
  }> = {}) => {
    return {
      id: faker.string.uuid(),
      name: `${faker.system.fileName()}.xlsx`,
      size: faker.number.int({ min: 1024, max: 1024 * 1024 * 10 }), // 1KB to 10MB
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: faker.date.recent().toISOString(),
      status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
      rowCount: faker.number.int({ min: 1, max: 10000 }),
      ...overrides
    };
  },

  createMany: (count: number, overrides: Partial<{ 
    id: string; 
    name: string; 
    size: number; 
    type: string; 
    uploadedAt: string;
    status: string;
    rowCount: number;
  }> = {}) => {
    return Array.from({ length: count }, () => fileMetadataFactory.create(overrides));
  }
};

// Utility to generate Excel file content as a string (CSV format for simplicity)
export const generateExcelContent = (rows: number = 10, columns: number = 5): string => {
  // Generate headers
  const headers = Array.from({ length: columns }, (_, i) => 
    faker.helpers.arrayElement(['Name', 'Email', 'Department', 'Salary', 'Hire Date', 'Status', 'ID', 'Role'])
  );
  
  // Generate data rows
  const dataRows = Array.from({ length: rows }, () => 
    Array.from({ length: columns }, () => {
      const fieldType = faker.helpers.arrayElement(['name', 'email', 'department', 'number', 'date', 'boolean']);
      switch (fieldType) {
        case 'name': return faker.person.fullName();
        case 'email': return faker.internet.email();
        case 'department': return faker.commerce.department();
        case 'number': return faker.number.int({ min: 1000, max: 999999 }).toString();
        case 'date': return faker.date.past().toISOString().split('T')[0];
        case 'boolean': return faker.datatype.boolean().toString();
        default: return faker.word.sample();
      }
    })
  );
  
  // Combine headers and data
  return [
    headers.join(','),
    ...dataRows.map(row => row.join(','))
  ].join('\n');
};