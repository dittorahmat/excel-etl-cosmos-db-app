import { AuthWrapper, useAuth } from "./auth/AuthProvider";
import { LoginButton } from "./components/auth/LoginButton";
import { Context7Example } from "./components/Context7Example";

// Main App Content
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Excel to Cosmos DB</h1>
          <LoginButton />
        </div>
      </header>
      
      <main className="flex-1 p-8">
        <div className="container mx-auto space-y-8">
          {isAuthenticated ? (
            <>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Welcome to Your Dashboard</h2>
                <p>You are now authenticated and can start using the application.</p>
                <p>Your access token has been stored in localStorage.</p>
              </div>
              
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Context7 Integration</h2>
                <Context7Example />
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Please sign in to continue</h2>
              <p className="text-muted-foreground">
                Sign in with your Microsoft account to access the dashboard and Context7 features.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// App wrapped with AuthProvider
const App = () => (
  <AuthWrapper>
    <AppContent />
  </AuthWrapper>
);

export default App;
