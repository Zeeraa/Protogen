import { AfterViewInit, ApplicationRef, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppSocketConnection, AppSocketPacket } from '../../../../../core/apps/AppSocketConnection';
import { AppsApi } from '../../../../../core/services/api/apps-api.service';
import { catchError, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { uuidv4 } from 'uuidv7';
import { hexToRgb, RGBColor, rgbToHex } from '../../../../../core/services/utils/Utils';

@Component({
  selector: 'app-paint-app-page',
  standalone: false,
  templateUrl: './paint-app-page.component.html',
  styleUrl: './paint-app-page.component.scss'
})
export class PaintAppPageComponent implements AfterViewInit, OnDestroy {
  private socket: AppSocketConnection | null = null;
  private connectSubscriptsion?: Subscription;
  private socketSubscriptsion?: Subscription;

  private pixelSize = 10;

  private width = 128;
  private height = 32;

  private isReady = false;
  private isDrawing = false;
  // Postions we have already drawn on the canvas
  private preventDrawPositions: Position[] = [];

  selectedColor = "#FFFFFF"

  private sessionId = uuidv4();

  @ViewChild("paintCanvas") private canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  constructor(
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private appsApi: AppsApi,
    private appRef: ApplicationRef,
  ) {
    this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
    this.onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  get canvasWidth() {
    return this.width * this.pixelSize;
  }

  get canvasHeight() {
    return this.height * this.pixelSize;
  }

  get disconnected() {
    return this.socket?.disconnected ?? false;
  }

  ngAfterViewInit(): void {
    console.log("PaintAppPageComponent::ngAfterViewInit()");

    const canvasEl = this.canvas.nativeElement;
    this.ctx = canvasEl.getContext('2d')!;
    this.clearCanvas();

    canvasEl.addEventListener('touchstart', (e) => { this.onCanvasMouseDown(e); }, { passive: false });
    canvasEl.addEventListener('touchmove', (e) => { this.onCanvasMouseMove(e); }, { passive: false });
    canvasEl.addEventListener('touchend', () => { this.onTouchEnd(); });
    canvasEl.addEventListener('touchcancel', () => { this.onTouchEnd(); });

    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.toastr.error("No token provided. Please check your url and try again");
      return;
    }
    this.socket = new AppSocketConnection(token);

    this.socketSubscriptsion = this.socket.messageObservable.subscribe((message) => {
      this.handleMessage(message);
    });

    this.connectSubscriptsion = this.socket.connectedObservable.subscribe(() => {
      this.toastr.success("Connected. Fetching data...");

      this.appsApi.getUserAppDetails(token).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status == 403) {
            this.toastr.error(err.error.message);
          } else {
            this.toastr.error("An error occurred while fetching app details. Please try again later.");
          }
          throw err;
        }),
      ).subscribe(data => {
        const w = data.metadata.canvas?.width;
        const h = data.metadata.canvas?.height;

        if (isNaN(w) || isNaN(h)) {
          this.toastr.error("Invalid canvas size received");
          return;
        }

        this.width = w;
        this.height = h;

        console.log("Got canvas size W:", w, "H:", h);

        this.appRef.tick();

        this.clearCanvas();

        const image = new Image();
        image.onload = () => {
          this.ctx.imageSmoothingEnabled = false;
          this.ctx.drawImage(image, 0, 0, this.canvasWidth, this.canvasHeight);
          // Ugly workaround since otherwise the brightness of the grid increases while drawing
          for (let i = 0; i < 5; i++) {
            this.drawGrid();
          }
          this.isReady = true;
        };
        image.src = data.metadata.image;
      });
    });

    this.socket.connect();
  }

  getCanvasCoordinates(event: MouseEvent | TouchEvent): Position {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in event) {
      if (event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      }
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  onCanvasMouseDown(event: MouseEvent | TouchEvent) {
    const pos = this.getCanvasCoordinates(event);
    if (!this.isDrawing) {
      this.preventDrawPositions = [];
      console.log("Begin drawing");
    }
    event.preventDefault();
    this.isDrawing = true;
    this.userDrawAt(pos);
  }

  onCanvasMouseMove(event: MouseEvent | TouchEvent) {
    if (this.isDrawing) {
      event.preventDefault();
      const pos = this.getCanvasCoordinates(event);
      this.userDrawAt(pos);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onGlobalMouseUp(_event: MouseEvent) {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.preventDrawPositions = [];
    }
  }

  onTouchEnd() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.preventDrawPositions = [];
    }
  }

  userDrawAt(canvasPos: Position) {
    if (this.socket?.connected !== true || !this.isReady) {
      return; // Don't draw if we are not connected
    }

    const rgb = hexToRgb(this.selectedColor);
    if (!rgb) {
      console.error("Invalid color selected:", this.selectedColor);
      return;
    }

    const x = Math.floor(canvasPos.x / this.pixelSize);
    const y = Math.floor(canvasPos.y / this.pixelSize);

    const locedPosition = this.preventDrawPositions.find(p => p.x == x && p.y == y);
    if (locedPosition) {
      return;
    }
    this.preventDrawPositions.push({ x, y });

    this.drawAt({ x, y }, rgb);

    const packet: PaintPixelPayload = {
      sessionId: this.sessionId,
      position: { x, y },
      color: rgb,
    };

    this.socket?.sendMessage({
      type: ProtogenPaintPackets.PaintPixel,
      data: packet,
    });
  }

  drawAt(gridPos: Position, color: RGBColor) {
    this.ctx.fillStyle = rgbToHex(color);
    this.ctx.fillRect(gridPos.x * this.pixelSize, gridPos.y * this.pixelSize, this.pixelSize, this.pixelSize);

    this.drawGrid(); // Draw the grid again
  }

  private clearCanvas() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Ugly workaround since otherwise the brightness of the grid increases while drawing
    for (let i = 0; i < 5; i++) {
      this.drawGrid();
    }
  }

  private drawGrid() {
    this.ctx.strokeStyle = "#555555";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvasWidth; x += this.pixelSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvasHeight; y += this.pixelSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = "#550000";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvasWidth / 2, 0);
    this.ctx.lineTo(this.canvasWidth / 2, this.canvasHeight);
    this.ctx.stroke();
  }

  handleMessage(message: AppSocketPacket<any>) {
    if (message.type == ProtogenPaintPackets.PaintPixel) {
      const payload = message.data as PaintPixelPayload;
      if (payload.sessionId != this.sessionId) {
        this.drawAt(payload.position, payload.color);
        this.preventDrawPositions = this.preventDrawPositions.filter(p => p.x != payload.position.x || p.y != payload.position.y);
      }
    } else if (message.type == ProtogenPaintPackets.Clear) {
      const payload = message.data as ClearPayload;
      if (payload.sessionId != this.sessionId) {
        this.clearCanvas();
        this.preventDrawPositions = [];
      }
    }
  }

  userClearCanvas() {
    if (this.socket?.connected !== true || !this.isReady) {
      return; // Don't draw if we are not connected
    }

    this.clearCanvas();

    const packet: ClearPayload = {
      sessionId: this.sessionId,
    };

    this.socket?.sendMessage({
      type: ProtogenPaintPackets.Clear,
      data: packet,
    });
  }

  ngOnDestroy(): void {
    this.connectSubscriptsion?.unsubscribe();
    this.socketSubscriptsion?.unsubscribe();
    this.socket?.destroy();
  }
}

interface Position {
  x: number;
  y: number;
}

interface PaintPixelPayload {
  sessionId: string;
  position: Position;
  color: RGBColor;
}

interface ClearPayload {
  sessionId: string;
}

enum ProtogenPaintPackets {
  PaintPixel = "PaintPixel",
  Clear = "Clear",
}
