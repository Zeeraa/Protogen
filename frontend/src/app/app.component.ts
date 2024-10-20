import { Component, OnInit } from '@angular/core';
import { SocketService } from './core/services/socket/socket.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor(
    private socket: SocketService
  ) {
  }

  ngOnInit(): void {
    this.socket.init();
  }
}
