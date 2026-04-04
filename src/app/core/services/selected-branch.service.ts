import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PublicBranch } from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class SelectedBranchService {
  private readonly branchSubject = new BehaviorSubject<PublicBranch | null>(null);
  readonly selectedBranch$: Observable<PublicBranch | null> = this.branchSubject.asObservable();

  setBranch(branch: PublicBranch): void {
    this.branchSubject.next(branch);
  }

  clearBranch(): void {
    this.branchSubject.next(null);
  }

  getBranch(): PublicBranch | null {
    return this.branchSubject.value;
  }
}
