// frontend/app/components/layout/Header.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Switch } from '../ui/Switch'; // Assuming shadcn/ui component

const Header: React.FC = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 shadow-md dark:bg-gray-800 bg-white sticky top-0 z-10">
      <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
        Tic-Tac-Toe
      </h1>
      <div className="flex items-center space-x-4">
        {user && (
          <span className="hidden md:block text-sm text-gray-600 dark:text-gray-300">
            Welcome, <span className="font-semibold">{user.username}</span>
          </span>
        )}
        <div className="flex items-center space-x-2">
          <Sun className="h-5 w-5 text-yellow-500" />
          <Switch checked={darkMode} onCheckedChange={toggleDarkMode} aria-label="Toggle dark mode"/>
          <Moon className="h-5 w-5 text-slate-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;