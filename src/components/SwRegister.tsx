'use client';

import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      const onLoad = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/service-worker.js');
          // Optional: listen for updates (you can expand later)
          console.log('PHStud Service Worker registered:', reg.scope);
        } catch (err) {
          console.error('SW registration failed:', err);
        }
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return null;
}
