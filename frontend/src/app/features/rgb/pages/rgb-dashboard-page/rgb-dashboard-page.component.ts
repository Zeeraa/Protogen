import { Component, OnDestroy, OnInit } from '@angular/core';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { SocketService } from '../../../../core/services/socket/socket.service';

@Component({
  selector: 'app-rgb-dashboard-page',
  templateUrl: './rgb-dashboard-page.component.html',
  styleUrl: './rgb-dashboard-page.component.scss'
})
export class RgbDashboardPageComponent implements OnInit, OnDestroy {
  scenes: RgbScene[] = [];

  constructor(
    private toastr: ToastrService,
    private rgbApi: RgbApiService,
    private socket: SocketService,
  ) { }

  addBlank() {
    this.rgbApi.createNewScene("New scene").pipe(catchError(err => {
      this.toastr.error("Failed to create new scene");
      throw err;
    })).subscribe((scene) => {
      this.scenes.push(scene);
      this.toastr.success("Scene created");
    });
  }

  disable() {
    this.rgbApi.deactivate().pipe(catchError(err => {
      this.toastr.error("Failed to disable rgb");
      throw err;
    })).subscribe(() => {
      this.toastr.success("RGB Disabled");
    });
  }

  loadEffects() {
    this.rgbApi.getScenes().pipe(catchError(err => {
      this.toastr.error("Failed to fetch scenes. Try reloading the page");
      throw err;
    })).subscribe(scenes => {
      this.scenes = scenes;
    });
  }

  ngOnInit(): void {
    this.loadEffects();
    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, true);
  }

  ngOnDestroy(): void {
    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, false);
  }
}
