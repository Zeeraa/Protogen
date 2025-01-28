import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { ToastrService } from 'ngx-toastr';
import { RemoteApiService } from '../../../../core/services/api/remote-api.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-joystick-editor',
  templateUrl: './joystick-editor.component.html',
  styleUrl: './joystick-editor.component.scss'
})
export class JoystickEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  private drawInterval: any;
  private socketSubscribeInterval: any;
  private socketSubscription: Subscription | null = null;
  joystickState: JoystickState = {
    x: 0.5,
    y: 0.5,
    pressed: false,
  }

  width = 200;
  height = 200;

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

    // Cirlce
    const radius = Math.min(this.width, this.height) / 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Joystick position
    const dotRadius = 20;
    const posX = this.joystickState.x * this.width;
    const posY = this.joystickState.y * this.height;

    this.ctx.beginPath();
    this.ctx.arc(posX, posY, dotRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.joystickState.pressed ? "#00FF00" : "#0000FF";
    this.ctx.fill();
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
        const state = msg.data as JoystickState;
        this.joystickState = {
          x: state.x,
          y: state.y,
          pressed: state.pressed,
        }
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.drawInterval);
    clearInterval(this.socketSubscribeInterval);

    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, false);

    this.socketSubscription?.unsubscribe();
  }
}

export interface JoystickState {
  x: number;
  y: number;
  pressed: boolean;
}
