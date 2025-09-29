// Simple test script to verify Cosmos DB access and authorization query
import { DatabaseAccessControlService } from './server/src/services/access-control/database-access-control.service.js';

async function testDatabaseAccess() {
  console.log('Testing DatabaseAccessControlService...');
  
  try {
    console.log('Attempting to fetch authorized users from database...');
    const usersFromDb = await DatabaseAccessControlService.getAuthorizedUsersFromDatabase();
    console.log('Users from DB:', usersFromDb);
    
    console.log('Attempting to get authorized users with fallback...');
    const usersWithFallback = await DatabaseAccessControlService.getAuthorizedUsersWithFallback();
    console.log('Users with fallback:', usersWithFallback);
    
    console.log('Testing if ditto.asnar@gmail.com is authorized...');
    const isAuthorized = await DatabaseAccessControlService.isUserAuthorized('ditto.asnar@gmail.com');
    console.log('Is ditto.asnar@gmail.com authorized?', isAuthorized);
    
    // Clear cache and test again
    console.log('Clearing cache...');
    DatabaseAccessControlService.clearCache();
    
    console.log('Re-testing if ditto.asnar@gmail.com is authorized (after cache clear)...');
    const isAuthorizedAfterClear = await DatabaseAccessControlService.isUserAuthorized('ditto.asnar@gmail.com');
    console.log('Is ditto.asnar@gmail.com authorized (after cache clear)?', isAuthorizedAfterClear);
    
  } catch (error) {
    console.error('Error during database access test:', error);
  }
}

// Run the test
testDatabaseAccess();