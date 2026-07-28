import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { DevotionalListFilters, DevotionalPublicDetail, DevotionalPublicListItem } from '../models/devotional.model';
import { PaginatedResponse } from '../models/pagination.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DevotionalService {
  private readonly api = inject(ApiService);
  private readonly publicDevotionalsEndpoint = 'public/devotionals/';

  getDevotionals(
    filters: DevotionalListFilters = {},
    pathOrUrl: string = this.publicDevotionalsEndpoint
  ): Observable<PaginatedResponse<DevotionalPublicListItem>> {
    const params = pathOrUrl === this.publicDevotionalsEndpoint
      ? {
          ...(filters.page ? { page: filters.page } : {}),
        }
      : undefined;

    return this.api.get<PaginatedResponse<DevotionalPublicListItem>>(pathOrUrl, params);
  }

  getDevotionalBySlug(slug: string): Observable<DevotionalPublicDetail> {
    const normalizedSlug = slug.trim();
    return this.api.get<DevotionalPublicDetail>(
      `${this.publicDevotionalsEndpoint}${encodeURIComponent(normalizedSlug)}`
    );
  }
}
