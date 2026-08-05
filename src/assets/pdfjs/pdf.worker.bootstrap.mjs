if (typeof Promise.try !== 'function') {
  Object.defineProperty(Promise, 'try', {
    configurable: true,
    writable: true,
    value(callback, ...args) {
      return new Promise((resolve, reject) => {
        try {
          resolve(callback(...args));
        } catch (error) {
          reject(error);
        }
      });
    },
  });
}

await import('./pdf.worker.min.mjs');
