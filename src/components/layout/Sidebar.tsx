import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Upload,
  Database,
  Settings,
  History,
  ChevronDown,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Data Upload',
    path: '/upload',
    icon: Upload,
  },
  {
    title: 'Data Management',
    icon: Database,
    subItems: [
      { title: 'View All Data', path: '/data', icon: Database },
      { title: 'Add New', path: '/data/new', icon: Database },
    ],
  },
  {
    title: 'History',
    path: '/history',
    icon: History,
  },
];

import { KeyRound } from 'lucide-react';

const adminMenuItems = [
  {
    title: 'Settings',
    path: '/settings',
    icon: Settings,
  },
  {
    title: 'API Keys',
    path: '/api-keys',
    icon: KeyRound,
  },
];

export const Sidebar = () => {
  const { isAuthenticated } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold">ETL</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) =>
          item.subItems ? (
            <div key={item.title}>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => toggleSection(item.title)}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.title}
                </div>
                {openSections[item.title] ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
              {openSections[item.title] && (
                <div className="pl-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                          isActive
                            ? 'bg-gray-200 dark:bg-gray-700'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        )
                      }
                    >
                      <subItem.icon className="mr-3 h-5 w-5" />
                      {subItem.title}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                  isActive
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.title}
            </NavLink>
          )
        )}
        {isAuthenticated && (
          <div className="pt-4 mt-4 border-t dark:border-gray-700">
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
};