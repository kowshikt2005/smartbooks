'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon,
  UsersIcon,
  CubeIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
// import { StockNotifications } from '../inventory/StockNotifications';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  current?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'WhatsApp', href: '/whatsapp', icon: ChatBubbleLeftRightIcon },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Update navigation items with current state
  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: pathname === item.href || pathname.startsWith(item.href + '/')
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SmartBooks</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-5 px-2">
          {updatedNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md mb-1 transition-colors ${
                  item.current
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`mr-4 h-6 w-6 ${
                  item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SmartBooks</span>
          </div>
          
          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {updatedNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-6 w-6 ${
                    item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              {/* Search */}
              <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-start">
                <div className="max-w-lg w-full lg:max-w-xs">
                  <label htmlFor="search" className="sr-only">Search</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="search"
                      name="search"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Search..."
                      type="search"
                    />
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full">
                  <BellIcon className="h-6 w-6" />
                </button>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    <span className="ml-2 text-gray-700 hidden sm:block">{user?.email}</span>
                    <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-400" />
                  </button>

                  {/* User dropdown */}
                  {userMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                          <div className="font-medium">{user?.email}</div>
                          <div className="text-xs text-gray-500">Signed in</div>
                        </div>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Your Profile
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 gap-1">
          {updatedNavigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center py-2 px-1 text-xs ${
                  item.current
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;