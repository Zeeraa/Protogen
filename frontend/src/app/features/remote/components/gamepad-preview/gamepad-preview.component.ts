import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { Subscription } from 'rxjs';
import { emptyGamepadState, GamepadState } from '../../../../core/interfaces/GamepadState';

@Component({
  selector: 'app-gamepad-preview',
  templateUrl: './gamepad-preview.component.html',
  styleUrl: './gamepad-preview.component.scss',
  standalone: false
})
export class GamepadPreviewComponent implements OnInit, OnDestroy {
  private readonly socket = inject(SocketService);

  public readonly controllerType = input.required<ControllerType>();

  protected readonly state = signal<GamepadState>(emptyGamepadState());

  private subscription: Subscription | null = null;
  private interval: any;

  ngOnInit(): void {
    this.interval = setInterval(() => {
      this.socket.sendMessage(SocketMessageType.C2S_EnableGamepadPreview, true);
    }, 2000);
    this.socket.sendMessage(SocketMessageType.C2S_EnableGamepadPreview, true);

    this.subscription = this.socket.messageObservable.subscribe((msg) => {
      if (msg.type == SocketMessageType.S2C_GamepadState) {
        const state = msg.data.state as GamepadState;
        this.state.set(state);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    clearInterval(this.interval);
    this.socket.sendMessage(SocketMessageType.C2S_EnableGamepadPreview, false);
  }
}

export type ControllerType = "xbox" | "playstation";