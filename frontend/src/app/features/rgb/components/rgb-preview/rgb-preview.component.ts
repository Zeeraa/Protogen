import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { catchError, Subscription } from 'rxjs';
import { numberToHexColor } from '../../../../core/services/utils/Utils';
import { RgbApiService, RgbPreviewConfiguration, RgbPreviewElementType } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { uuidv7 } from 'uuidv7';

@Component({
  selector: 'app-rgb-preview',
  templateUrl: './rgb-preview.component.html',
  styleUrl: './rgb-preview.component.scss'
})
export class RgbPreviewComponent implements OnInit, OnDestroy, AfterViewInit {
  private interval: any;
  private subscription: Subscription | null = null;
  config: RgbPreviewConfiguration = {
    canvas: {
      width: 720,
      height: 400,
    },
    largeViewportFullSize: false,
    elements: []
  };
  settingsVisible = false;

  // Canvas width and height
  cw = 1;
  ch = 1;

  @ViewChild("rbgPreviewCanvas") canvas!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;
  ledStates: number[] = [];

  constructor(
    private socket: SocketService,
    private api: RgbApiService,
    private toastr: ToastrService,
  ) { }

  get fullOnLargeViewports() {
    return this.config.largeViewportFullSize;
  }

  ngOnInit(): void {
    this.interval = setInterval(() => {
      this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, true);
    }, 2000);
    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, true);

    this.subscription = this.socket.messageObservable.subscribe((msg) => {
      if (msg.type == SocketMessageType.S2C_RgbPreview) {
        this.ledStates = msg.data.leds;
        this.draw();
      }
    });

    this.loadDefaultSettings();
    this.applySettings();
  }

  discardSettings() {
    this.loadDefaultSettings();
    this.settingsVisible = false;
  }

  loadDefaultSettings() {
    this.api.getRgbPreviewConfig().pipe(catchError(err => {
      this.toastr.error("Failed to fetch rgb preview config");
      throw err;
    })).subscribe(config => {
      console.log("RGB editor config loaded");
      this.config = config;
      this.applySettings();
    });
  }

  addElement() {
    this.config.elements.push({
      id: uuidv7(), // Give a temporary uuid so we can reference the object
      length: 1,
      name: "New element",
      startIndex: 1,
      type: RgbPreviewElementType.LedStrip,
      x: 15,
      y: 15,
    })
  }

  savePreviewSettings() {
    this.api.setRgbPreviewConfig(this.config).pipe(catchError(err => {
      this.toastr.error("Failed to save config");
      throw err;
    })).subscribe(() => {
      this.settingsVisible = false;
      this.toastr.success("Preview settings saved");
    });
  }

  get socketUnavailable() {
    return !this.socket.connected;
  }

  setSettingsVisible(visible: boolean) {
    this.settingsVisible = visible;
  }

  ngAfterViewInit(): void {
    const canvasEl = this.canvas.nativeElement;
    this.ctx = canvasEl.getContext('2d')!;
    this.draw();
  }

  ngOnDestroy(): void {
    if (this.interval != null) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.subscription?.unsubscribe();
    this.subscription = null;
    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, false);
  }

  applySettings() {
    this.config.elements.sort((a, b) => a.startIndex - b.startIndex);

    this.cw = this.config.canvas.width;
    this.ch = this.config.canvas.height;

    //#region Fix invalid values
    if (isNaN(parseInt(String(this.cw)))) {
      this.config.canvas.width = 720;
      this.cw = this.config.canvas.width;
    }

    if (isNaN(parseInt(String(this.ch)))) {
      this.config.canvas.width = 400;
      this.ch = this.config.canvas.height;
    }

    if (this.cw < 1) {
      this.config.canvas.width = 1;
      this.cw = this.config.canvas.width;
    }

    if (this.ch < 1) {
      this.config.canvas.width = 1;
      this.ch = this.config.canvas.height;
    }
    //#endregion
  }

  draw() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.cw, this.ch);

    if (this.config.elements.length == 0) {
      this.ctx.font = '14px Helvetica';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText("No rgb elements defined", 10, 20);
    }

    this.config.elements.forEach(e => {
      const y = e.y + 20;

      this.ctx.font = '14px Helvetica';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(e.name, e.x, e.y);

      if (e.type == RgbPreviewElementType.LedRing) {
        //#region Led ring
        const ringRadius = (dotRadius * 2 + dotSpacing) * e.length / (2 * Math.PI);
        const centerX = e.x + ringRadius;
        const centerY = y + ringRadius;

        for (let i = 0; i < e.length; i++) {
          const ledIndex = e.startIndex + i;
          const angle = (i / e.length) * 2 * Math.PI;

          const dotX = centerX + ringRadius * Math.cos(angle);
          const dotY = centerY + ringRadius * Math.sin(angle);

          this.ctx.beginPath();
          this.ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI, false);
          if (this.ledStates.length >= ledIndex - 1) {
            this.ctx.fillStyle = numberToHexColor(this.ledStates[ledIndex]);
          } else {
            this.ctx.fillStyle = 'white';
          }
          this.ctx.fill();

          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = 'gray';
          this.ctx.stroke();
        }
        //#endregion
      } else if (e.type == RgbPreviewElementType.LedStrip) {
        for (let i = 0; i < e.length; i++) {
          const ledIndex = e.startIndex + i;

          const x = e.x + (i * ((dotSpacing * 2) + dotRadius)) + dotRadius;

          this.ctx.beginPath();
          this.ctx.arc(x, y, dotRadius, 0, 2 * Math.PI, false);
          if (this.ledStates.length >= ledIndex - 1) {
            this.ctx.fillStyle = numberToHexColor(this.ledStates[ledIndex]);
          } else {
            this.ctx.fillStyle = 'white';
          }
          this.ctx.fill();

          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = 'gray';
          this.ctx.stroke();
        }
      }
    });
  }
}

const dotRadius = 10;
const dotSpacing = 10;
