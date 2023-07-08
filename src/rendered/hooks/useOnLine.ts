import { useEffect, useState } from 'react';

export const useOnLine = () => {
  const [onLine, setOnLine] = useState(navigator.onLine);

  const handleOnline = () => setOnLine(true);
  const handleOffline = () => setOnLine(false);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { onLine };
};
