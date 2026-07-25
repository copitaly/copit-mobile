import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

export interface BibleStudyDownloadResult {
  fileName: string;
  locationLabel: string;
  uri?: string;
}

@Injectable({ providedIn: 'root' })
export class BibleStudyDownloadService {
  private static readonly DOWNLOAD_DIRECTORY = 'COP/BibleStudy';

  async downloadPdf(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    if (Capacitor.isNativePlatform()) {
      return this.downloadNative(pdfUrl, fileName);
    }

    return this.downloadInBrowser(pdfUrl, fileName);
  }

  private async downloadNative(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    const platform = Capacitor.getPlatform();
    const path = `${BibleStudyDownloadService.DOWNLOAD_DIRECTORY}/${fileName}`;

    if (platform === 'android') {
      const permissionStatus = await Filesystem.checkPermissions();
      if (permissionStatus.publicStorage !== 'granted') {
        const requested = await Filesystem.requestPermissions();
        if (requested.publicStorage !== 'granted') {
          throw new Error('Storage permission denied');
        }
      }
    }

    await Filesystem.downloadFile({
      url: pdfUrl,
      path,
      directory: Directory.Documents,
      recursive: true,
    });

    const uri = await Filesystem.getUri({
      path,
      directory: Directory.Documents,
    });

    return {
      fileName,
      uri: uri.uri,
      locationLabel:
        platform === 'android'
          ? 'your Documents/COP/BibleStudy folder'
          : 'the Files app under COP/BibleStudy',
    };
  }

  private async downloadInBrowser(pdfUrl: string, fileName: string): Promise<BibleStudyDownloadResult> {
    const response = await fetch(pdfUrl);
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
}
