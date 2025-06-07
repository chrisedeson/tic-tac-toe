// frontend/app/hooks/useNotifications.ts
// frontend/app/hooks/useNotifications.ts
import { toast, type ToastOptions, type Id } from 'react-toastify';
import type { ReactNode } from 'react';

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

  const showInteractive = (content: ReactNode, options?: NotificationOptions) => {
    toast(content, {
      ...options,
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      type: 'default',
    });
  };

  const dismiss = (id?: Id) => {
    toast.dismiss(id);
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showInteractive,
    dismiss,
  };
};
