import React from "react";
import { motion } from "framer-motion";

// map each triple to its CSS overlay
const lineStyles: Record<string, React.CSSProperties> = {
  // Horizontal
  "0,1,2": {
    top: "16.66%",
    width: "100%",
    height: "4px",
    left: "0",
    transform: "translateY(-50%)",
  },
  "3,4,5": {
    top: "50%",
    width: "100%",
    height: "4px",
    left: "0",
    transform: "translateY(-50%)",
  },
  "6,7,8": {
    top: "83.33%",
    width: "100%",
    height: "4px",
    left: "0",
    transform: "translateY(-50%)",
  },
  // Vertical
  "0,3,6": {
    left: "16.66%",
    height: "100%",
    width: "4px",
    top: "0",
    transform: "translateX(-50%)",
  },
  "1,4,7": {
    left: "50%",
    height: "100%",
    width: "4px",
    top: "0",
    transform: "translateX(-50%)",
  },
  "2,5,8": {
    left: "83.33%",
    height: "100%",
    width: "4px",
    top: "0",
    transform: "translateX(-50%)",
  },
  // Diagonal
  "0,4,8": {
    top: "50%",
    left: "50%",
    width: "120%",
    height: "4px",
    transform: "translate(-50%, -50%) rotate(45deg)",
  },
  "2,4,6": {
    top: "50%",
    left: "50%",
    width: "120%",
    height: "4px",
    transform: "translate(-50%, -50%) rotate(-45deg)",
  },
};

interface WinningLineProps {
  line: number[] | null;
}

const WinningLine: React.FC<WinningLineProps> = ({ line }) => {
  if (!line) return null;
  const key = line.join(",");
  const style = lineStyles[key];
  if (!style) return null;

  return (
    <motion.div
      className="absolute bg-red-500 rounded-full"
      style={{
        ...style,
        zIndex: 20,
        transformOrigin: "center",
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
  );
};

export default WinningLine;
