// frontend/src/components/common/Spinner.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return <Loader2 size={size} className="animate-spin text-blue-500" />;
};

export default Spinner;