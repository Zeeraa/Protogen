import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppSocketConnection } from '../../../../../core/apps/AppSocketConnection';

@Component({
  selector: 'app-paint-app-page',
  standalone: false,
  templateUrl: './paint-app-page.component.html',
  styleUrl: './paint-app-page.component.scss'
})
export class PaintAppPageComponent implements OnInit, OnDestroy {
  private socket: AppSocketConnection | null = null;

  constructor(
    private toastr: ToastrService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.toastr.error("No token provided. Please check your url and try again");
      return;
    }
    this.socket = new AppSocketConnection(token);
    this.socket.connect();
  }

  ngOnDestroy(): void {
    this.socket?.destroy();
  }
}
