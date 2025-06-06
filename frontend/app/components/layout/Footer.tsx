// frontend/src/components/layout/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="h-14 flex items-center justify-center px-6 dark:bg-gray-800 bg-white border-t dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Tic-Tac-Toe Multiplayer. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;