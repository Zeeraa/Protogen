import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { ToastrService } from 'ngx-toastr';
import { RemoteApiService, RemoteControlInputType } from '../../../../core/services/api/remote-api.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { catchError, Subscription } from 'rxjs';
import { typeAssert } from '../../../../core/services/utils/Utils';
import { blankRemoteState, RemoteState } from '../../interface/RemoteState';

@Component({
  selector: 'app-joystick-editor',
  templateUrl: './joystick-editor.component.html',
  styleUrl: './joystick-editor.component.scss'
})
export class JoystickEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  private drawInterval: any;
  private socketSubscribeInterval: any;
  private socketSubscription: Subscription | null = null;
  joystickState: RemoteState = blankRemoteState();

  width = 200;
  height = 200;

  invertX = false;
  invertY = false;
  invertAxis = false;

  @Input() showStateText = false;
  @Input() framerate = 20;

  @ViewChild("remotePreviewCanvas") canvas!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  constructor(
    private socket: SocketService,
    private toastr: ToastrService,
    private remoteApi: RemoteApiService,
  ) { }

  draw() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = "#999999";
    this.ctx.lineWidth = 2;

    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();

    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 0);
    this.ctx.lineTo(this.width / 2, this.height);
    this.ctx.stroke();

    // Large Circle
    const radius = Math.min(this.width, this.height) / 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Joystick position
    const dotRadius = 20; // Dot size
    const maxDistance = radius; // Keep the dot's center inside the circle

    // Convert joystick input (0 to 1) to canvas space
    let posX = this.joystickState.joystickX * this.width;
    let posY = this.joystickState.joystickY * this.height;

    // Calculate vector from center to joystick position
    let deltaX = posX - centerX;
    let deltaY = posY - centerY;
    let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Constrain dot center inside the big circle
    if (distance > maxDistance) {
      let angle = Math.atan2(deltaY, deltaX);
      posX = centerX + Math.cos(angle) * maxDistance;
      posY = centerY + Math.sin(angle) * maxDistance;
    }

    // Draw the joystick dot
    this.ctx.beginPath();
    this.ctx.arc(posX, posY, dotRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.joystickState.joystickPressed ? "#00FF00" : "#0000FF";
    this.ctx.fill();

    // Draw zone
    const zoneIndicatorRadius = 5;
    const zoneIndicatorOffset = 20;

    let zoneX = this.width / 2;
    let zoneY = this.height / 2;

    if (this.joystickState.state == RemoteControlInputType.JOYSTICK_UP) {
      zoneY = zoneIndicatorOffset;
    } else if (this.joystickState.state == RemoteControlInputType.JOYSTICK_DOWN) {
      zoneY = this.height - zoneIndicatorOffset;
    } else if (this.joystickState.state == RemoteControlInputType.JOYSTICK_LEFT) {
      zoneX = zoneIndicatorOffset;
    } else if (this.joystickState.state == RemoteControlInputType.JOYSTICK_RIGHT) {
      zoneX = this.width - zoneIndicatorOffset;
    }

    this.ctx.beginPath();
    this.ctx.arc(zoneX, zoneY, zoneIndicatorRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#FF0000";
    this.ctx.fill();
  }

  onInvertXToggle(event: Event) {
    const invertX = (event.target as HTMLInputElement).checked == true;
    this.remoteApi.alterConfig({ invertX }).pipe(catchError(err => {
      this.toastr.error("Failed to save config");
      throw err;
    })).subscribe();
  }

  onInvertYToggle(event: Event) {
    const invertY = (event.target as HTMLInputElement).checked == true;
    this.remoteApi.alterConfig({ invertY }).pipe(catchError(err => {
      this.toastr.error("Failed to save config");
      throw err;
    })).subscribe();
  }

  onInvertAxisToggle(event: Event) {
    const flipAxis = (event.target as HTMLInputElement).checked == true;
    this.remoteApi.alterConfig({ flipAxis }).pipe(catchError(err => {
      this.toastr.error("Failed to save config");
      throw err;
    })).subscribe();
  }

  ngAfterViewInit(): void {
    const canvasEl = this.canvas.nativeElement;
    this.ctx = canvasEl.getContext('2d')!;
    this.draw();
    this.drawInterval = setInterval(() => {
      this.draw();
    }, 1000 / this.framerate);
  }

  ngOnInit(): void {
    this.socketSubscribeInterval = setInterval(() => {
      this.socket.sendMessage(SocketMessageType.C2S_EnableRemotePreview, true);
    }, 2000);
    this.socket.sendMessage(SocketMessageType.C2S_EnableRemotePreview, true);

    this.socketSubscription = this.socket.messageObservable.subscribe((msg) => {
      if (msg.type == SocketMessageType.S2C_RemoteState) {
        this.joystickState = typeAssert<RemoteState>(msg.data)
      }
    });

    this.remoteApi.getConfig().pipe(catchError(err => {
      this.toastr.error("Failed to read remote config");
      throw err;
    })).subscribe(config => {
      this.invertX = config.invertX;
      this.invertY = config.invertY;
      this.invertAxis = config.flipAxis;
    })
  }

  ngOnDestroy(): void {
    clearInterval(this.drawInterval);
    clearInterval(this.socketSubscribeInterval);

    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, false);

    this.socketSubscription?.unsubscribe();
  }
}
