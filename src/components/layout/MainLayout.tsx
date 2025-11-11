import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps): JSX.Element => {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Navbar />
          <main className="flex-1 p-4 overflow-y-auto bg-background">
            {children}
          </main>
          <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t">
            Accelerating Low Carbon Energy Transition
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
};