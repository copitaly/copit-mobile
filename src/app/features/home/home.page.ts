import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  readonly isAuthenticated$: Observable<boolean>;

  constructor(private readonly authService: AuthService, private readonly router: Router) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goToAccount(isAuthenticated: boolean | null): void {
    void this.router.navigate([isAuthenticated ? '/profile' : '/login']);
  }
}
