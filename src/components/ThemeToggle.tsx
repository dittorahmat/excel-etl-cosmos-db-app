'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon } from 'lucide-react'; // Only import Moon icon since we're always in dark mode
import { Button } from './ui/button';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme } = useTheme(); // We don't need the current theme since we're always in dark mode

  // Set theme to dark on mount and whenever component is rendered
  useEffect(() => {
    setMounted(true);
    setTheme('dark'); // Force dark mode
  }, [setTheme]);

  if (!mounted) {
    return null;
  }

  // Always show dark mode icon without toggle functionality
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled // Disable the button since there's no toggling functionality
      className="ml-2"
      aria-label="Dark mode enabled"
    >
      <Moon className="h-5 w-5" /> {/* Always show the moon icon for dark mode */}
    </Button>
  );
}
