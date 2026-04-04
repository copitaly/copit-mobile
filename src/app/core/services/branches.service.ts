import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { PublicBranch } from '../models/branch.model';
import { PaginatedResponse } from '../models/pagination.model';

export interface PublicBranchFilters extends QueryParams {
  search?: string;
  page?: number;
  page_size?: number;
  level?: string;
  is_active?: boolean;
  donations_enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly endpoint = 'public/branches/';

  constructor(private readonly api: ApiService) {}

  getBranches(filters?: PublicBranchFilters): Observable<PaginatedResponse<PublicBranch>> {
    const merged: PublicBranchFilters = {
      level: 'local',
      is_active: true,
      donations_enabled: true,
      ...filters,
    };

    return this.api.get<PaginatedResponse<PublicBranch>>(this.endpoint, merged).pipe(
      tap(response => {
        console.log(`[BranchesService] endpoint ${this.endpoint} returned ${response.results.length} branches`);
      })
    );
  }
}
