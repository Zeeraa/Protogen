import { AfterViewInit, ApplicationRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppSocketConnection } from '../../../../../core/apps/AppSocketConnection';
import { AppsApi } from '../../../../../core/services/api/apps-api.service';
import { catchError, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-paint-app-page',
  standalone: false,
  templateUrl: './paint-app-page.component.html',
  styleUrl: './paint-app-page.component.scss'
})
export class PaintAppPageComponent implements AfterViewInit, OnDestroy {
  private socket: AppSocketConnection | null = null;
  private connectSubscriptsion?: Subscription;

  private pixelSize = 10;

  private width = 128;
  private height = 32;

  @ViewChild("paintCanvas") private canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  constructor(
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private appsApi: AppsApi,
    private appRef: ApplicationRef,
  ) { }

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

    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.toastr.error("No token provided. Please check your url and try again");
      return;
    }
    this.socket = new AppSocketConnection(token);

    this.connectSubscriptsion = this.socket.connectedObservable.subscribe(() => {
      this.toastr.success("Connected to app socket. Fetching data...");

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
          this.drawGrid();
        };
        image.src = data.metadata.image;
      });
    });

    this.socket.connect();
  }

  private clearCanvas() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawGrid();
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

  ngOnDestroy(): void {
    this.connectSubscriptsion?.unsubscribe();
    this.socket?.destroy();
  }
}

enum PaintActions {
  PaintPixel = "PaintPixel",
  Clear = "Clear",
}
