import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PublicBranch } from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class SelectedBranchService {
  private readonly branchSubject = new BehaviorSubject<PublicBranch | null>(null);
  readonly selectedBranch$: Observable<PublicBranch | null> = this.branchSubject.asObservable();

  setBranch(branch: PublicBranch | null | undefined): boolean {
    if (!branch?.id || !branch?.name?.trim()) {
      return false;
    }

    this.branchSubject.next({
      ...branch,
      name: branch.name.trim(),
      branch_code: branch.branch_code ?? '',
      donations_enabled: branch.donations_enabled ?? true,
      is_active: branch.is_active ?? true,
      district: branch.district ?? null,
      area: branch.area ?? null,
    });
    return true;
  }

  clearBranch(): void {
    this.branchSubject.next(null);
  }

  getBranch(): PublicBranch | null {
    return this.branchSubject.value;
  }
}
