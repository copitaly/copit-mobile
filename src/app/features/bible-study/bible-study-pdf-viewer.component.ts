import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output } from '@angular/core';
import {
  NgxExtendedPdfViewerModule,
  PageRenderedEvent,
  PagesLoadedEvent,
  PdfLoadedEvent,
  PdfLoadingStartsEvent,
  ProgressBarEvent,
  pdfjsVersion,
  pdfDefaultOptions,
} from 'ngx-extended-pdf-viewer';

pdfDefaultOptions.assetsFolder = '/assets';
pdfDefaultOptions.workerSrc = () => `/assets/pdf.worker-${pdfjsVersion}.min.mjs`;

@Component({
  standalone: true,
  selector: 'app-bible-study-pdf-viewer',
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngx-extended-pdf-viewer
      class="bible-study-pdf-viewer"
      [src]="src"
      [page]="page"
      [zoom]="zoom"
      [showToolbar]="false"
      [showSidebarButton]="false"
      [showFindButton]="false"
      [showPagingButtons]="false"
      [showZoomButtons]="false"
      [showZoomDropdown]="false"
      [showPresentationModeButton]="false"
      [showOpenFileButton]="false"
      [showPrintButton]="false"
      [showDownloadButton]="false"
      [showSecondaryToolbarButton]="false"
      [showRotateButton]="false"
      [showRotateCwButton]="false"
      [showRotateCcwButton]="false"
      [showHandToolButton]="false"
      [showPropertiesButton]="false"
      [showScrollingButtons]="false"
      [showSpreadButton]="false"
      [showPageNumber]="false"
      [showPageLabel]="false"
      [textLayer]="true"
      [backgroundColor]="'#eef2f7'"
      [pdfBackgroundColor]="'#ffffff'"
      [pageViewMode]="'infinite-scroll'"
      [mobileFriendlyZoom]="'page-width'"
      [minZoom]="0.5"
      [maxZoom]="4"
      [height]="'100%'"
      [minHeight]="'100%'"
      [showBorders]="false"
      [listenToURL]="false"
      [imageResourcesPath]="'/assets/images/'"
      [localeFolderPath]="'/assets/locale'"
      (progress)="progress.emit($event)"
      (pageChange)="pageChange.emit($event)"
      (pageRendered)="pageRendered.emit($event)"
      (pagesLoaded)="pagesLoaded.emit($event)"
      (pdfLoaded)="pdfLoaded.emit($event)"
      (pdfLoadingStarts)="pdfLoadingStarts.emit($event)"
      (pdfLoadingFailed)="pdfLoadingFailed.emit($event)"
      (currentZoomFactor)="currentZoomFactor.emit($event)"
    ></ngx-extended-pdf-viewer>
  `,
  styles: [
    `
      :host,
      .bible-study-pdf-viewer {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 100%;
      }
    `,
  ],
})
export class BibleStudyPdfViewerComponent {
  @Input({ required: true }) src = '';
  @Input() page?: number;
  @Input() zoom: string | number = 'page-width';

  @Output() progress = new EventEmitter<ProgressBarEvent>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageRendered = new EventEmitter<PageRenderedEvent>();
  @Output() pagesLoaded = new EventEmitter<PagesLoadedEvent>();
  @Output() pdfLoaded = new EventEmitter<PdfLoadedEvent>();
  @Output() pdfLoadingStarts = new EventEmitter<PdfLoadingStartsEvent>();
  @Output() pdfLoadingFailed = new EventEmitter<Error>();
  @Output() currentZoomFactor = new EventEmitter<number>();
}
