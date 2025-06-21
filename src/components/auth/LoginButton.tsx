import { Button } from "../ui/button.js"
import { useAuth } from "../../auth/AuthProvider.js"

export const LoginButton = () => {
  const { isAuthenticated, login, logout, user } = useAuth();

  return (
    <div className="flex items-center gap-4">
      {isAuthenticated ? (
        <>
          <span className="text-sm text-muted-foreground">
            Welcome, {user?.name || 'User'}
          </span>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </>
      ) : (
        <Button onClick={login}>
          Sign in with Microsoft
        </Button>
      )}
    </div>
  );
};
