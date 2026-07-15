import { Component, computed, inject, input, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { Subscription } from 'rxjs';
import { emptyGamepadState, GamepadState } from '../../../../core/interfaces/GamepadState';
import { ControllerType } from '../../../../core/services/api/gamepad-api.service';

@Component({
  selector: 'app-gamepad-preview',
  templateUrl: './gamepad-preview.component.html',
  styleUrl: './gamepad-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class GamepadPreviewComponent implements OnInit, OnDestroy {
  private readonly socket = inject(SocketService);

  public readonly controllerType = input.required<ControllerType>();

  protected readonly state = signal<GamepadState>(emptyGamepadState());

  // Steam Controller renders as PlayStation
  protected readonly renderType = computed(() =>
    this.controllerType() === ControllerType.STEAM_CONTROLLER
      ? ControllerType.PLAYSTATION
      : this.controllerType()
  );

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

