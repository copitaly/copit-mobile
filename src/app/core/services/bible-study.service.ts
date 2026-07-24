import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PaginatedResponse } from '../models/pagination.model';
import {
  BibleStudyManualDetail,
  BibleStudyManualListFilters,
  BibleStudyManualListItem,
} from '../models/bible-study.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BibleStudyService {
  private readonly api = inject(ApiService);
  private readonly publicManualsEndpoint = 'public/bible-study/manuals/';

  getPublishedManuals(
    filters: BibleStudyManualListFilters = {},
    pathOrUrl: string = this.publicManualsEndpoint
  ): Observable<PaginatedResponse<BibleStudyManualListItem>> {
    const params =
      pathOrUrl === this.publicManualsEndpoint
        ? {
            ...(filters.year ? { year: filters.year } : {}),
            ...(filters.language?.trim() ? { language: filters.language.trim() } : {}),
          }
        : undefined;

    return this.api.get<PaginatedResponse<BibleStudyManualListItem>>(pathOrUrl, params);
  }

  getPublishedManualDetail(id: number): Observable<BibleStudyManualDetail> {
    return this.api.get<BibleStudyManualDetail>(`${this.publicManualsEndpoint}${id}/`);
  }
}
