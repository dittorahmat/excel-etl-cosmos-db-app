import { Context7Client } from '@upstash/context7-mcp';
import { useAuth } from '@/auth/AuthProvider';

// Initialize the Context7 client
export const context7Client = new Context7Client({
  // Add any required configuration here
  // For example, API keys or endpoints if needed
});

// Hook to use Context7 with authentication
export const useContext7WithAuth = () => {
  const { getAccessToken, isAuthenticated } = useAuth();

  const queryContext = async (query: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Add the token to the request headers
      const response = await context7Client.query({
        query,
        context: {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      });

      return response;
    } catch (error) {
      console.error('Context7 query error:', error);
      throw error;
    }
  };

  return {
    query: queryContext,
    isAuthenticated,
    // Add other Context7 methods as needed
  };
};

// Example of how to use the hook in a component:
/*
function MyComponent() {
  const { query } = useContext7WithAuth();

  const handleSearch = async () => {
    try {
      const results = await query('your search query');
      console.log('Context7 results:', results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <button onClick={handleSearch}>
      Search with Context7
    </button>
  );
}
*/
