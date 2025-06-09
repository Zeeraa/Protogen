import { Component, OnDestroy, OnInit } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { catchError, Subscription } from 'rxjs';
import { DevApi, HardwareEmulationState } from '../../../../core/services/api/dev-api.service';
import { typeAssert } from '../../../../core/services/utils/Utils';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { ClipboardService } from 'ngx-clipboard';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-developer-page',
  standalone: false,
  templateUrl: './developer-page.component.html',
  styleUrl: './developer-page.component.scss'
})
export class DeveloperPageComponent implements OnInit, OnDestroy {
  private subscribeToSocketInterval?: any;
  private socketSubscription?: Subscription;

  private hardwareEmulationStatus = HardwareEmulationStatus.Loading;
  private hardwareEmulationChangeBuffer: EmulatedHardwareChange[] = [];
  private _hardwareState: HardwareEmulationState = { boopSensorState: false, ledData: [], hudLines: [], volume: 0 };

  constructor(
    protected socket: SocketService,
    private devApi: DevApi,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
    private clipboard: ClipboardService,
    private auth: AuthService,
  ) { }

  get hardwareEmulationStatusString() {
    return this.hardwareEmulationStatus as string;
  }

  get hardwareState(): HardwareEmulationState {
    return this._hardwareState;
  }

  copyAuthToken() {
    const token = this.auth.token;
    if (token) {
      this.clipboard.copy(token);
      this.toastr.success("Copied auth token to clipboard");
    } else {
      this.toastr.error("Not authenticated");
    }
  }

  toggleBoopSensor() {
    this.devApi.toggleEmulatedBoopSensor().pipe(catchError((error) => {
      this.toastr.error("Failed to toggle sensor state");
      console.error(error);
      throw error;
    })).subscribe(result => {
      if (result.success) {
        this._hardwareState.boopSensorState = this._hardwareState.boopSensorState || false;
      } else {
        this.toastr.error("Emulated sensor unavailable");
      }
    });
  }

  private processHardwareEmulationChange(change: EmulatedHardwareChange) {
    if (this.hardwareEmulationStatus === HardwareEmulationStatus.Loading) {
      this.hardwareEmulationStatus = HardwareEmulationStatus.Available;
    }
    if (change.boopSensorState !== undefined) {
      this._hardwareState.boopSensorState = change.boopSensorState;
    }
    if (change.ledData !== undefined) {
      this._hardwareState.ledData = change.ledData;
    }
    if (change.hudLines !== undefined) {
      this._hardwareState.hudLines = change.hudLines;
    }
    if (change.volume !== undefined) {
      this._hardwareState.volume = change.volume;
    }
    if (change.messages !== undefined) {
      console.log("Received messages:", change.messages);
      //TODO: print to a cool looking console :3
    }
  }

  ngOnInit(): void {
    this.subscribeToSocketInterval = setInterval(() => {
      this.socket.sendMessage(SocketMessageType.C2S_EnableDevData, true);
    }, 1000 * 2);
    this.socket.sendMessage(SocketMessageType.C2S_EnableDevData, true);
    this.socketSubscription = this.socket.messageObservable.subscribe((message) => {
      if (message.type === SocketMessageType.S2C_DevHardwareEmulationState) {
        if (this.hardwareEmulationStatus == HardwareEmulationStatus.Loading) {
          this.hardwareEmulationChangeBuffer.push(message.data);
          return;
        } else if (this.hardwareEmulationStatus == HardwareEmulationStatus.Unavailable) {
          return;
        }
        this.processHardwareEmulationChange(message.data);
      }
    });

    this.devApi.getEmulatedHardwareStatus().pipe(catchError((error) => {
      console.error("Error fetching hardware emulation status:", error);
      this.hardwareEmulationStatus = HardwareEmulationStatus.Unavailable;
      this.hardwareEmulationChangeBuffer = [];
      throw error;
    })).subscribe(result => {
      if (result.hwEmulationEnabled) {
        this._hardwareState = typeAssert<HardwareEmulationState>(result.state);
        this.hardwareEmulationStatus = HardwareEmulationStatus.Available;
        this.hardwareEmulationChangeBuffer.forEach(change => {
          this.processHardwareEmulationChange(change);
        });
      } else {
        this.hardwareEmulationStatus = HardwareEmulationStatus.Unavailable;
        this.hardwareEmulationChangeBuffer = [];
      }
    });
  }

  get hudLinesDisplay(): SafeHtml {
    const html = this._hardwareState.hudLines
      .map((line, idx) => `${idx + 1}: ${this.sanitizer.sanitize(1, line) ?? ''}`)
      .join('<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnDestroy(): void {
    if (this.subscribeToSocketInterval) {
      clearInterval(this.subscribeToSocketInterval);
    }
    this.socketSubscription?.unsubscribe();
    this.socket.sendMessage(SocketMessageType.C2S_EnableDevData, false);
  }
}

enum HardwareEmulationStatus {
  Loading = "loading",
  Available = "available",
  Unavailable = "unavailable",
}


export interface EmulatedHardwareChange {
  boopSensorState?: boolean;
  ledData?: number[];
  hudLines?: string[];
  volume?: number;
  messages?: string[];
}
