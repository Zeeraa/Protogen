import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SocketService } from './core/services/socket/socket.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { SystemConfigService } from './core/services/system-config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly theme = inject(ThemeService);
  protected readonly systemConfig = inject(SystemConfigService);

  ngOnInit(): void {
    this.init();
  }

  async init() {
    await this.systemConfig.load();
    if (this.systemConfig.error()) return;
    await this.auth.init();
    this.socket.init();

    console.log("Theme: " + this.theme.theme());
  }
}
