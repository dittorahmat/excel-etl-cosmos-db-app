import { test, expect } from '@playwright/test';
import { generateExcelContent } from '../../src/test-utils/factories';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to create a temporary Excel file
async function createTempExcelFile(rows: number, cols: number): Promise<string> {
  const content = generateExcelContent(rows, cols);
  const filePath = path.join(__dirname, `temp-test-file-${Date.now()}.xlsx`);
  
  // In a real implementation, we would generate an actual Excel file
  // For now, we'll create a simple CSV file for testing
  const csvContent = content.map(row => row.join(',')).join('\n');
  fs.writeFileSync(filePath, csvContent);
  
  return filePath;
}

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Excel/);
});

test('can upload a file', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Check that the file input is visible
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();
});

test('can navigate to dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Check that dashboard elements are present
  const dashboardHeader = page.locator('h1:has-text("Dashboard")');
  await expect(dashboardHeader).toBeVisible();
});

test('can navigate to file management', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Click on the file management link (adjust selector as needed)
  const fileManagementLink = page.locator('a:has-text("Files")');
  await fileManagementLink.click();
  
  // Check that we're on the file management page
  await expect(page).toHaveURL(/.*files/);
});

test('can navigate to API key management', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Click on the API key management link (adjust selector as needed)
  const apiKeyLink = page.locator('a:has-text("API Keys")');
  await apiKeyLink.click();
  
  // Check that we're on the API key management page
  await expect(page).toHaveURL(/.*api-keys/);
});

test('can view data visualization', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Check that chart elements are present
  const chartContainer = page.locator('.recharts-wrapper');
  await expect(chartContainer).toBeVisible();
});