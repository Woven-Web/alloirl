if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('Service Worker registration successful');
      },
      (err) => {
        console.log('Service Worker registration failed:', err);
      }
    );
  });
}
