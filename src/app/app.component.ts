import { Component } from '@angular/core';
import { DeepLinkService } from './core/services/deep-link.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private readonly deepLinkService: DeepLinkService) {
    console.log('[AppComponent] rendered at', new Date().toISOString());
  }
}
