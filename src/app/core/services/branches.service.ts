import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce, tap } from 'rxjs/operators';
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
  private readonly defaultPageSize = 200;

  constructor(private readonly api: ApiService) {}

  getBranches(filters?: PublicBranchFilters): Observable<PaginatedResponse<PublicBranch>> {
    return this.fetchBranchesPage(this.endpoint, this.buildFilters(filters)).pipe(
      tap(response => {
        console.log(`[BranchesService] endpoint ${this.endpoint} returned ${response.results.length} branches`);
      })
    );
  }

  getAllBranches(filters?: PublicBranchFilters): Observable<PublicBranch[]> {
    return this.fetchBranchesPage(this.endpoint, this.buildFilters(filters)).pipe(
      expand(response => response.next ? this.fetchBranchesPage(response.next) : EMPTY),
      reduce((allBranches, response) => allBranches.concat(response.results), [] as PublicBranch[]),
      tap(branches => {
        console.log(`[BranchesService] resolved ${branches.length} total branches across all pages`);
      })
    );
  }

  private buildFilters(filters?: PublicBranchFilters): PublicBranchFilters {
    return {
      level: 'local',
      is_active: true,
      donations_enabled: true,
      page: 1,
      page_size: this.defaultPageSize,
      ...filters,
    };
  }

  private fetchBranchesPage(pathOrUrl: string, params?: QueryParams): Observable<PaginatedResponse<PublicBranch>> {
    return this.api.get<PaginatedResponse<PublicBranch>>(pathOrUrl, params).pipe(
      map(response => ({
        ...response,
        results: response.results.map(branch => ({
          ...branch,
          branch_code: branch.branch_code ?? '',
          donations_enabled: branch.donations_enabled ?? true,
          is_active: branch.is_active ?? true,
          district: branch.district ?? null,
          area: branch.area ?? null,
        })),
      }))
    );
  }
}
