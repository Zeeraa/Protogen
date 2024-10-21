import { Component, OnDestroy, OnInit } from '@angular/core';
import { VisorApiService, VisorRenderer, VisorStatus } from '../../../../core/services/api/visor-api.service';
import { catchError, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-visor-page',
  templateUrl: './visor-page.component.html',
  styleUrl: './visor-page.component.scss'
})
export class VisorPageComponent implements OnInit, OnDestroy {
  private socketSubscription: Subscription | null = null;

  status: VisorStatus | null = null;
  renderers: VisorRenderer[] = [];
  updateInterval: any = null;
  updatePreviewInterval: any = null;
  previewImage = "/visor_blank.png";

  get hasRenderLock() {
    return this.status?.hasRenderLock === true;
  }

  get renderLocks() {
    return this.status?.renderLocks || [];
  }

  get rendererName() {
    return this.status?.activeRenderer?.name || "";
  }

  update() {
    this.api.getStatus().subscribe(status => {
      this.status = status;
    })
  }

  fetchRenderers() {
    this.api.getRenderers().pipe(catchError(err => {
      this.toastr.error("Failed to fetch renderers");
      throw err;
    })).subscribe(renderers => {
      this.renderers = renderers;
    });
  }

  async updatePreviewHttp() {
    try {
      this.previewImage = await this.api.getPreviewBase64();
    } catch (err) {
      console.log(err);
      this.toastr.error("Failed to fetch visor preview");
    }
  }

  constructor(
    private api: VisorApiService,
    private toastr: ToastrService,
    private socket: SocketService,
    private title: Title,
  ) { }

  ngOnInit(): void {
    this.update();
    this.fetchRenderers();
    this.updatePreviewHttp();

    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);

    this.updatePreviewInterval = setInterval(() => {
      if (!this.socket.connected) {
        this.updatePreviewHttp();
      }
    }, 2000);

    this.socketSubscription = this.socket.messageObservable.subscribe(msg => {
      if (msg.type == SocketMessageType.S2C_VisorPreview) {
        const base64 = msg.data.base64 as string;
        this.previewImage = "data:image/png;base64," + base64;
      }
    })
    this.socket.sendMessage(SocketMessageType.C2S_EnableVisorPreview, true);

    this.title.setTitle("Visor - Protogen");
  }

  ngOnDestroy(): void {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }

    if (this.updatePreviewInterval != null) {
      clearInterval(this.updatePreviewInterval);
    }

    this.socketSubscription?.unsubscribe();
    this.socket.sendMessage(SocketMessageType.C2S_EnableVisorPreview, false);
    this.socketSubscription = null;
  }
}
