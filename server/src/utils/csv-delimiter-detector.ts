import * as fs from 'fs/promises';
import { logger } from '../utils/logger.js';

/**
 * Detects the delimiter used in a CSV file by analyzing the first few lines
 * @param filePath Path to the CSV file
 * @returns The detected delimiter (comma, semicolon, or tab)
 */
export async function detectCsvDelimiter(filePath: string): Promise<string> {
  try {
    // Read the first few lines of the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n').slice(0, 5); // Analyze first 5 lines
    
    if (lines.length === 0) {
      logger.debug('Empty file, defaulting to comma delimiter');
      return ',';
    }
    
    // Possible delimiters to check
    const delimiters = [',', ';', '\t'];
    const delimiterCounts: Record<string, number[]> = {};
    
    // Initialize counts array for each delimiter
    delimiters.forEach(delimiter => {
      delimiterCounts[delimiter] = [];
    });
    
    // Count occurrences of each delimiter in each line
    for (const line of lines) {
      // Skip empty lines
      if (line.trim() === '') continue;
      
      for (const delimiter of delimiters) {
        // Count occurrences of delimiter not within quotes
        const count = countDelimiterOutsideQuotes(line, delimiter);
        if (delimiterCounts[delimiter]) {
          delimiterCounts[delimiter].push(count);
        }
      }
    }
    
    // Find the delimiter with the most consistent count across lines
    let bestDelimiter = ',';
    let bestConsistency = -1;
    
    for (const delimiter of delimiters) {
      const counts = delimiterCounts[delimiter];
      if (!counts || counts.length === 0) continue;
      
      // Calculate consistency (how many lines have the same count)
      const consistency = calculateConsistency(counts);
      
      logger.debug(`Delimiter '${delimiter}' consistency: ${consistency}, counts: [${counts.join(', ')}]`);
      
      // If this delimiter is more consistent, or if it's tied but has more total occurrences
      const totalOccurrences = counts.reduce((sum, count) => sum + count, 0);
      const bestCounts = delimiterCounts[bestDelimiter];
      const bestTotalOccurrences = bestCounts ? bestCounts.reduce((sum, count) => sum + count, 0) : 0;
      
      if (consistency > bestConsistency || 
          (consistency === bestConsistency && totalOccurrences > bestTotalOccurrences)) {
        bestConsistency = consistency;
        bestDelimiter = delimiter;
      }
    }
    
    logger.debug(`Detected delimiter: '${bestDelimiter}' with consistency: ${bestConsistency}`);
    
    // If we couldn't detect a good delimiter, default to comma
    if (bestConsistency === 0) {
      logger.debug('No consistent delimiter found, defaulting to comma');
      return ',';
    }
    
    return bestDelimiter;
  } catch (error) {
    logger.warn('Error detecting CSV delimiter, defaulting to comma', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return ','; // Default to comma on error
  }
}

/**
 * Counts occurrences of a delimiter in a line, excluding those within quoted fields
 * @param line The line to analyze
 * @param delimiter The delimiter to count
 * @returns Number of occurrences of the delimiter outside quoted fields
 */
function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    // Handle quote characters
    if (char === '"' || char === "'") {
      if (!inQuotes) {
        // Opening quote
        inQuotes = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        // Closing quote (might be doubled)
        if (i + 1 < line.length && line[i + 1] === char) {
          // Skip the doubled quote
          i++;
        } else {
          // Close the quoted section
          inQuotes = false;
          quoteChar = '';
        }
      }
    }
    
    // Count delimiter if not in quotes
    if (char === delimiter && !inQuotes) {
      count++;
    }
  }
  
  return count;
}

/**
 * Calculates the consistency of delimiter counts across lines
 * @param counts Array of delimiter counts per line
 * @returns A consistency score (higher is more consistent)
 */
function calculateConsistency(counts: number[]): number {
  if (counts.length === 0) return 0;
  if (counts.length === 1) return 1; // Single line is perfectly consistent
  
  // Count how many lines have each count value
  const countFrequency: Record<number, number> = {};
  for (const count of counts) {
    countFrequency[count] = (countFrequency[count] || 0) + 1;
  }
  
  // Find the most frequent count
  let maxFrequency = 0;
  for (const frequency of Object.values(countFrequency)) {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
    }
  }
  
  // Return consistency as a ratio of lines with the most frequent count
  return maxFrequency / counts.length;
}