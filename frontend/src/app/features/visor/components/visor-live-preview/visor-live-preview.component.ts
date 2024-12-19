import { Component, OnDestroy, OnInit } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { ToastrService } from 'ngx-toastr';
import { VisorApiService } from '../../../../core/services/api/visor-api.service';
import { Subscription } from 'rxjs';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';

@Component({
  selector: 'app-visor-live-preview',
  templateUrl: './visor-live-preview.component.html',
  styleUrl: './visor-live-preview.component.scss'
})
export class VisorLivePreviewComponent implements OnInit, OnDestroy {
  private socketSubscription: Subscription | null = null;
  private updatePreviewInterval: any = null;

  previewImage = "/visor_blank.png";

  constructor(
    private api: VisorApiService,
    private toastr: ToastrService,
    private socket: SocketService,
  ) { }

  async updatePreviewHttp() {
    try {
      this.previewImage = await this.api.getPreviewBase64();
    } catch (err) {
      console.log(err);
      this.toastr.error("Failed to fetch visor preview");
    }
  }

  ngOnInit(): void {
    this.updatePreviewHttp();

    this.updatePreviewInterval = setInterval(() => {
      if (!this.socket.connected) {
        this.updatePreviewHttp();
      } else {
        // Restart on schedule in case the connection drops
        this.socket.sendMessage(SocketMessageType.C2S_EnableVisorPreview, true);
      }
    }, 2000);

    this.socketSubscription = this.socket.messageObservable.subscribe(msg => {
      if (msg.type == SocketMessageType.S2C_VisorPreview) {
        const base64 = msg.data.base64 as string;
        this.previewImage = "data:image/png;base64," + base64;
      }
    })
    this.socket.sendMessage(SocketMessageType.C2S_EnableVisorPreview, true);
  }

  ngOnDestroy(): void {
    if (this.updatePreviewInterval != null) {
      clearInterval(this.updatePreviewInterval);
    }

    this.socketSubscription?.unsubscribe();
    this.socket.sendMessage(SocketMessageType.C2S_EnableVisorPreview, false);
    this.socketSubscription = null;
  }
}
