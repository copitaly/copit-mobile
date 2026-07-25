import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface BibleStudyDownloadResult {
  fileName: string;
  locationLabel: string;
  uri?: string;
  shared?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BibleStudyDownloadService {
  private static readonly DOWNLOAD_DIRECTORY = 'COP/BibleStudy';
  private static readonly DEV_DIAGNOSTICS = typeof ngDevMode !== 'undefined' && !!ngDevMode;

  async downloadPdf(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    if (Capacitor.isNativePlatform()) {
      return this.downloadNative(pdfUrl, fileName);
    }

    return this.downloadInBrowser(pdfUrl, fileName);
  }

  private async downloadNative(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    const platform = Capacitor.getPlatform();
    const path = `${BibleStudyDownloadService.DOWNLOAD_DIRECTORY}/${fileName}`;
    const response = await fetch(pdfUrl);
    this.logDiagnostics('download fetch', {
      platform,
      ok: response.ok,
      status: response.status,
    });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    this.logDiagnostics('download bytes', { byteLength });
    if (!byteLength) {
      throw new Error('Downloaded PDF was empty');
    }

    const base64Data = this.arrayBufferToBase64(arrayBuffer);
    const uri = await this.writeNativeFile(path, base64Data);

    const shared = await this.shareNativeFile(uri, fileName);
    if (shared) {
      this.logDiagnostics('share invoke', { shared: true });

      return {
        fileName,
        uri,
        shared: true,
        locationLabel: 'your device share sheet',
      };
    }

    return {
      fileName,
      uri,
      locationLabel:
        platform === 'android'
          ? 'your device storage'
          : 'the Files app',
    };
  }

  private async downloadInBrowser(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    const response = await fetch(pdfUrl);
    this.logDiagnostics('browser fetch', { ok: response.ok, status: response.status });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    return {
      fileName,
      locationLabel: 'your browser downloads',
    };
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private async writeNativeFile(path: string, base64Data: string): Promise<string> {
    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });
    this.logDiagnostics('filesystem write', { path, directory: Directory.Cache });

    const uri = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    });
    this.logDiagnostics('filesystem uri', { hasUri: !!uri.uri });

    return uri.uri;
  }

  private logDiagnostics(event: string, payload: Record<string, unknown>): void {
    if (!BibleStudyDownloadService.DEV_DIAGNOSTICS) {
      return;
    }

    console.debug('[BibleStudyDownload]', event, payload);
  }

  private async shareNativeFile(uri: string, fileName: string): Promise<boolean> {
    const canShare = await Share.canShare();
    if (!canShare.value) {
      return false;
    }

    await Share.share({
      title: fileName,
      text: 'Bible Study PDF',
      url: uri,
      dialogTitle: 'Open or save PDF',
    });
    return true;
  }
}
