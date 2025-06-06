// frontend/app/hooks/useNotifications.ts
import { toast } from 'react-toastify';
import type { ToastOptions } from 'react-toastify'

interface NotificationOptions extends ToastOptions {}

export const useNotifications = () => {
  const showSuccess = (message: string, options?: NotificationOptions) => {
    toast.success(message, options);
  };

  const showError = (message: string, options?: NotificationOptions) => {
    toast.error(message, options);
  };

  const showInfo = (message: string, options?: NotificationOptions) => {
    toast.info(message, options);
  };

  const showWarning = (message: string, options?: NotificationOptions) => {
    toast.warn(message, options);
  };

  // For challenges or interactive toasts
  const showInteractive = (content: React.ReactNode, options?: NotificationOptions) => {
    toast(content, { ...options, autoClose: false, closeOnClick: false });
  };


  return { showSuccess, showError, showInfo, showWarning, showInteractive };
};