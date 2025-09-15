import { describe, it, expect } from 'vitest';
import { excelRowFactory, userFactory, fileMetadataFactory, generateExcelContent } from './factories';

describe('Test Data Factories', () => {
  it('should create a single excel row', () => {
    const row = excelRowFactory.create();
    
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('name');
    expect(row).toHaveProperty('email');
    expect(row).toHaveProperty('department');
    expect(row).toHaveProperty('salary');
    expect(typeof row.salary).toBe('number');
    expect(row).toHaveProperty('hireDate');
    expect(row).toHaveProperty('isActive');
    expect(typeof row.isActive).toBe('boolean');
  });

  it('should create multiple excel rows', () => {
    const rows = excelRowFactory.createMany(5);
    
    expect(rows).toHaveLength(5);
    rows.forEach(row => {
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('name');
      expect(row).toHaveProperty('email');
    });
  });

  it('should allow overriding properties', () => {
    const row = excelRowFactory.create({ name: 'John Doe', department: 'Engineering' });
    
    expect(row.name).toBe('John Doe');
    expect(row.department).toBe('Engineering');
  });

  it('should create a user', () => {
    const user = userFactory.create();
    
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(['admin', 'user', 'viewer']).toContain(user.role);
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('lastLogin');
  });

  it('should create file metadata', () => {
    const file = fileMetadataFactory.create();
    
    expect(file).toHaveProperty('id');
    expect(file).toHaveProperty('name');
    expect(file.name).toMatch(/\.xlsx$/);
    expect(file).toHaveProperty('size');
    expect(typeof file.size).toBe('number');
    expect(file).toHaveProperty('type');
    expect(file.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(file).toHaveProperty('uploadedAt');
    expect(file).toHaveProperty('status');
    expect(['pending', 'processing', 'completed', 'failed']).toContain(file.status);
    expect(file).toHaveProperty('rowCount');
    expect(typeof file.rowCount).toBe('number');
  });

  it('should generate Excel content', () => {
    const content = generateExcelContent(3, 4);
    const lines = content.split('\n');
    
    expect(lines).toHaveLength(4); // 1 header + 3 data rows
    expect(lines[0].split(',')).toHaveLength(4); // 4 columns
    lines.slice(1).forEach(line => {
      expect(line.split(',')).toHaveLength(4);
    });
  });
});