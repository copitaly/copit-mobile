import {
  installPromiseTryCompat,
  loadPdfJsModule,
  resetPdfJsModuleForTests,
  type PromiseTryCompatible,
} from './pdfjs-runtime';

describe('pdfjs-runtime', () => {
  const originalPromiseTry = (Promise as PromiseTryCompatible).try;

  beforeEach(() => {
    resetPdfJsModuleForTests();
    delete (Promise as PromiseTryCompatible).try;
  });

  afterEach(() => {
    resetPdfJsModuleForTests();
    if (originalPromiseTry) {
      (Promise as PromiseTryCompatible).try = originalPromiseTry;
    } else {
      delete (Promise as PromiseTryCompatible).try;
    }
  });

  it('does not overwrite an existing Promise.try implementation', () => {
    const existing = jasmine.createSpy('existing');
    (Promise as PromiseTryCompatible).try = existing;

    installPromiseTryCompat();

    expect((Promise as PromiseTryCompatible).try).toBe(existing);
  });

  it('installs the fallback when Promise.try is missing', () => {
    installPromiseTryCompat();

    expect(typeof (Promise as PromiseTryCompatible).try).toBe('function');
  });

  it('resolves a synchronous callback result', async () => {
    installPromiseTryCompat();

    await expectAsync((Promise as PromiseTryCompatible).try?.(() => 'ready')!).toBeResolvedTo('ready');
  });

  it('resolves an asynchronous callback result', async () => {
    installPromiseTryCompat();

    await expectAsync((Promise as PromiseTryCompatible).try?.(() => Promise.resolve('async-ready'))!).toBeResolvedTo(
      'async-ready'
    );
  });

  it('rejects a synchronous exception', async () => {
    installPromiseTryCompat();

    await expectAsync(
      (Promise as PromiseTryCompatible).try?.(() => {
        throw new Error('boom');
      })!
    ).toBeRejectedWithError('boom');
  });

  it('forwards callback arguments', async () => {
    installPromiseTryCompat();

    await expectAsync((Promise as PromiseTryCompatible).try?.((left, right) => `${left}-${right}`, 'en', 'it')!).toBeResolvedTo(
      'en-it'
    );
  });

  it('installs compatibility before importing PDF.js', async () => {
    const importer = jasmine.createSpy('importer').and.callFake(async () => {
      expect(typeof (Promise as PromiseTryCompatible).try).toBe('function');
      return {
        GlobalWorkerOptions: {},
      } as never;
    });

    await loadPdfJsModule(importer);

    expect(importer).toHaveBeenCalled();
  });
});
