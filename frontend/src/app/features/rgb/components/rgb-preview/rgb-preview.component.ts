import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { Subscription } from 'rxjs';
import { numberToHexColor } from '../../../../core/services/utils/Utils';

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
    elements: [
      {
        name: "Right ring",
        type: RgbPreviewElementType.LedRing,
        startIndex: 0,
        length: 24,
        x: 15,
        y: 15,
      },
      {
        name: "Left ring",
        type: RgbPreviewElementType.LedRing,
        startIndex: 24,
        length: 24,
        x: 300,
        y: 15,
      },
    ]
  };

  @ViewChild("rbgPreviewCanvas") canvas!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;
  ledStates: number[] = [];

  constructor(
    private socket: SocketService,
  ) { }

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

  draw() {
    console.log(this.ledStates.length);
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);

    this.config.elements.forEach(e => {
      const y = e.y + 20;

      this.ctx.font = '14px Helvetica';
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(e.name, e.x, e.y);

      if (e.type == RgbPreviewElementType.LedRing) {
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
      }
    });
  }
}

const dotRadius = 10;
const dotSpacing = 10;

export interface RgbPreviewConfiguration {
  canvas: RgbPreviewCanvas;
  elements: RgbPreviewElement[];
}

export interface RgbPreviewCanvas {
  width: number;
  height: number;
}

export interface RgbPreviewElement {
  name: string;
  type: RgbPreviewElementType;
  x: number;
  y: number;
  startIndex: number,
  length: number,
}

export enum RgbPreviewElementType {
  LedStrip = "LedStrip",
  LedRing = "LedRing",
}

