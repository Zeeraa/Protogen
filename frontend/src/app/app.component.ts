import { Component, OnInit } from '@angular/core';
import { SocketService } from './core/services/socket/socket.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false
})
export class AppComponent implements OnInit {
  constructor(
    protected auth: AuthService,
    private socket: SocketService
  ) { }

  ngOnInit(): void {
    this.init();
  }

  async init() {
    await this.auth.init();
    this.socket.init();
  }
}
