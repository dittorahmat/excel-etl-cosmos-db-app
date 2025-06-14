import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOG_FILE = path.join(process.cwd(), 'logs/application.log');
const REPORT_FILE = path.join(process.cwd(), 'reports/auth-metrics.json');
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Metrics storage
const metrics = {
  totalRequests: 0,
  successfulLogins: 0,
  failedLogins: 0,
  lastCheck: new Date().toISOString(),
  errorsByType: {},
  users: new Set(),
  errorRates: [],
};

/**
 * Parse log file and update metrics
 */
async function analyzeLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      console.log('Log file not found, waiting for logs...');
      return;
    }

    const logData = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = logData.split('\n').filter(Boolean);
    
    // Process new logs since last check
    const newLogs = lines.filter(line => {
      const logDate = new Date(line.match(/\[.*?\]/)?.[0] || 0);
      return logDate > new Date(metrics.lastCheck);
    });

    // Update metrics
    newLogs.forEach(line => {
      metrics.totalRequests++;
      
      // Track successful logins
      if (line.includes('[Auth]') && line.includes('SUCCESS')) {
        metrics.successfulLogins++;
        
        // Extract user ID if available
        const userIdMatch = line.match(/User: ([^\s]+)/);
        if (userIdMatch && userIdMatch[1] !== 'anonymous') {
          metrics.users.add(userIdMatch[1]);
        }
      }
      
      // Track failed logins
      if (line.includes('[Auth]') && line.includes('FAILED')) {
        metrics.failedLogins++;
        
        // Categorize errors
        const errorType = line.match(/Error: ([^\n]+)/)?.[1] || 'unknown';
        metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;
      }
    });

    // Calculate error rate for this interval
    const totalAuthAttempts = metrics.successfulLogins + metrics.failedLogins;
    const errorRate = totalAuthAttempts > 0 
      ? (metrics.failedLogins / totalAuthAttempts) * 100 
      : 0;
      
    metrics.errorRates.push({
      timestamp: new Date().toISOString(),
      rate: errorRate.toFixed(2)
    });
    
    // Keep only last 100 data points
    if (metrics.errorRates.length > 100) {
      metrics.errorRates.shift();
    }
    
    metrics.lastCheck = new Date().toISOString();
    
    // Save metrics to file
    saveMetrics();
    
  } catch (error) {
    console.error('Error analyzing logs:', error);
  }
}

/**
 * Save metrics to report file
 */
function saveMetrics() {
  try {
    // Create reports directory if it doesn't exist
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportData = {
      ...metrics,
      uniqueUsers: metrics.users.size,
      errorRate: metrics.errorRates[metrics.errorRates.length - 1]?.rate || '0.00',
      generatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(REPORT_FILE, JSON.stringify(reportData, null, 2));
    console.log(`[${new Date().toISOString()}] Auth metrics updated`);
    
  } catch (error) {
    console.error('Error saving metrics:', error);
  }
}

/**
 * Generate a summary report
 */
function generateSummary() {
  return {
    timestamp: new Date().toISOString(),
    totalRequests: metrics.totalRequests,
    successfulLogins: metrics.successfulLogins,
    failedLogins: metrics.failedLogins,
    uniqueUsers: metrics.users.size,
    currentErrorRate: metrics.errorRates[metrics.errorRates.length - 1]?.rate || '0.00',
    commonErrors: Object.entries(metrics.errorsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 errors
  };
}

// Start monitoring
console.log('Starting authentication monitoring...');
console.log(`Log file: ${LOG_FILE}`);
console.log(`Report file: ${REPORT_FILE}`);

// Initial analysis
analyzeLogs();

// Schedule periodic analysis
setInterval(analyzeLogs, CHECK_INTERVAL_MS);

// Log summary periodically
setInterval(() => {
  console.log('\n--- Authentication Summary ---');
  console.log(JSON.stringify(generateSummary(), null, 2));
  console.log('------------------------------\n');
}, 15 * 60 * 1000); // Every 15 minutes

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nStopping authentication monitor...');
  saveMetrics();
  process.exit(0);
});

export { generateSummary };
