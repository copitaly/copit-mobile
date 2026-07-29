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

  async downloadPdf(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    const normalizedUrl = this.normalizeDocumentUrl(pdfUrl);
    if (!normalizedUrl) {
      throw new Error('Invalid PDF URL');
    }

    const safeFileName = this.buildSafeFileName(fileName);
    if (Capacitor.isNativePlatform()) {
      return this.downloadNative(normalizedUrl, safeFileName);
    }

    return this.downloadInBrowser(normalizedUrl, safeFileName);
  }

  private async downloadNative(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    const platform = Capacitor.getPlatform();
    const path = `${BibleStudyDownloadService.DOWNLOAD_DIRECTORY}/${fileName}`;
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    this.ensureSupportedContentType(response.headers.get('Content-Type'));

    const arrayBuffer = await response.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    if (!byteLength) {
      throw new Error('Downloaded PDF was empty');
    }

    const base64Data = this.arrayBufferToBase64(arrayBuffer);
    const uri = await this.writeNativeFile(path, base64Data);

    const shared = await this.shareNativeFile(uri, fileName);
    if (shared) {
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
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    this.ensureSupportedContentType(response.headers.get('Content-Type'));
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

    const uri = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    });

    return uri.uri;
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

  private normalizeDocumentUrl(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol === 'https:') {
      return parsedUrl.toString();
    }

    const isLocalHttp =
      protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsedUrl.hostname.toLowerCase());

    return isLocalHttp ? parsedUrl.toString() : null;
  }

  private ensureSupportedContentType(contentType: string | null): void {
    const normalized = (contentType ?? '').toLowerCase();
    if (!normalized) {
      return;
    }

    if (
      normalized.includes('application/pdf') ||
      normalized.includes('application/octet-stream') ||
      normalized.includes('binary/octet-stream')
    ) {
      return;
    }

    throw new Error('Unsupported PDF content type');
  }

  private buildSafeFileName(fileName: string): string {
    const normalized = (fileName ?? '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    const ensuredPdf = normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized || 'manual'}.pdf`;
    return ensuredPdf.slice(0, 120);
  }
}
