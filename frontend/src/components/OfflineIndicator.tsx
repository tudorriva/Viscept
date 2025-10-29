import React, { useEffect, useState } from 'react';
import { theme } from '../theme';

/**
 * Shows offline/online status of browser and backend
 */
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show || isOnline) return null;

  return (
    <div
      className="fixed bottom-6 left-6 p-4 rounded-lg animate-slide-in-up shadow-lg max-w-sm"
      style={{
        backgroundColor: theme.colors.status.warning,
        color: '#000',
        zIndex: 40,
      }}
    >
      <p className="text-sm font-semibold">⚠️ You are offline</p>
      <p className="text-xs mt-1 opacity-90">Generation requires internet. Editing works offline.</p>
    </div>
  );
};