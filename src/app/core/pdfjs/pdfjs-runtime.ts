export type PromiseTryCompatible = PromiseConstructor & {
  try?: <T>(
    callback: (...args: unknown[]) => T | PromiseLike<T>,
    ...args: unknown[]
  ) => Promise<Awaited<T>>;
};

export type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
export type PdfJsImporter = () => Promise<PdfJsModule>;

export const PDFJS_WORKER_ASSET_PATH = 'assets/pdfjs/pdf.worker.bootstrap.mjs';

let cachedPdfJsModulePromise: Promise<PdfJsModule> | null = null;

export function installPromiseTryCompat(target: PromiseTryCompatible = Promise): void {
  if (typeof target.try === 'function') {
    return;
  }

  Object.defineProperty(target, 'try', {
    configurable: true,
    writable: true,
    value: function promiseTry<T>(
      callback: (...args: unknown[]) => T | PromiseLike<T>,
      ...args: unknown[]
    ): Promise<Awaited<T>> {
      return new target((resolve, reject) => {
        try {
          resolve(callback(...args) as Awaited<T>);
        } catch (error) {
          reject(error);
        }
      });
    },
  });
}

export async function loadPdfJsModule(
  importer: PdfJsImporter = () => import('pdfjs-dist/legacy/build/pdf.mjs')
): Promise<PdfJsModule> {
  installPromiseTryCompat();

  cachedPdfJsModulePromise ??= importer();
  return cachedPdfJsModulePromise;
}

export function resetPdfJsModuleForTests(): void {
  cachedPdfJsModulePromise = null;
}
