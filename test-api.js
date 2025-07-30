// Test script to verify frontend-backend API communication
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '.env') });

// Determine the API base URL
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Test endpoint
const TEST_ENDPOINT = '/api/health';

// Run the test
async function testApiConnection() {
  try {
    console.log(`Testing API connection to: ${API_BASE_URL}${TEST_ENDPOINT}`);
    
    const response = await axios.get(`${API_BASE_URL}${TEST_ENDPOINT}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors
    });

    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
    });

    if (response.status === 200) {
      console.log('✅ Successfully connected to the API!');
    } else {
      console.warn('⚠️ API returned a non-200 status code. Check the response for details.');
    }
  } catch (error) {
    console.error('❌ Error connecting to the API:', error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testApiConnection();
