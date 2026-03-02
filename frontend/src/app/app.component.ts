import { Component, inject, OnInit } from '@angular/core';
import { SocketService } from './core/services/socket/socket.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly theme = inject(ThemeService);

  ngOnInit(): void {
    this.init();
  }

  async init() {
    this.theme.update();
    await this.auth.init();
    this.socket.init();
  }
}
