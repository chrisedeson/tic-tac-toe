// frontend/src/components/layout/Footer.tsx
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <div className="max-w-screen-lg mx-auto flex flex-col sm:flex-row justify-between items-center text-center sm:text-left space-y-2 sm:space-y-0 text-sm text-gray-500 dark:text-gray-400">
        <p>
          © {new Date().getFullYear()} Tic-Tac-Toe Multiplayer. All rights reserved.
        </p>
        <p>
          Created by{" "}
          <a
            href="https://www.linkedin.com/in/christopher-edeson"
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Christopher
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
