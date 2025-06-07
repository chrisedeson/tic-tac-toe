// frontend/src/components/layout/Footer.tsx
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="h-14 flex flex-col items-center justify-center px-6 dark:bg-gray-800 bg-white border-t dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Tic-Tac-Toe Multiplayer. All rights
        reserved.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Created and designed by{" "}
        <a
          href="https://www.linkedin.com/in/christopher-edeson"
          className="text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Christopher
        </a>
      </p>
    </footer>
  );
};

export default Footer;
