import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { catchError, Subscription } from 'rxjs';
import { AudioVisualizerApiService } from '../../../../core/services/api/audio-visualizer-api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-audio-visualizer-settings-page',
  standalone: false,
  templateUrl: './audio-visualizer-settings-page.component.html',
  styleUrl: './audio-visualizer-settings-page.component.scss'
})
export class AudioVisualizerSettingsPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private interval?: any;
  private audioSubscription?: Subscription;

  history: number[] = [];
  historyLength = 100;

  rawValue = 0;
  adjustedValue = 0;

  private _rawAmplification = 20;
  private _lowThreshold = 0;
  private _highThreshold = 100;

  get rawAmplification() {
    return this._rawAmplification;
  }

  set rawAmplification(value: number) {
    this._rawAmplification = value;
    this.draw();
    this.sendConfig();
  }

  get lowThreshold() {
    return this._lowThreshold;
  }

  set lowThreshold(value: number) {
    this._lowThreshold = value;
    this.draw();
    this.sendConfig();
  }

  get highThreshold() {
    return this._highThreshold;
  }

  set highThreshold(value: number) {
    this._highThreshold = value;
    this.draw();
    this.sendConfig();
  }

  @ViewChild("rawVolumePreviewCanvas") rawVolumePreviewCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild("adjustedVolumePreviewCanvas") adjustedVolumePreviewCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild("historyGraphCanvas") historyGraphCanvas!: ElementRef<HTMLCanvasElement>;
  rawPreviewCtx!: CanvasRenderingContext2D;
  adjustedPreviewCtx!: CanvasRenderingContext2D;
  historyGraphCtx!: CanvasRenderingContext2D;

  draw() {
    if (this.rawPreviewCtx == null || this.adjustedPreviewCtx == null || this.historyGraphCtx == null) {
      console.debug("Could not draw since context has not been created");
      return;
    }

    // Draw raw volume
    this.rawPreviewCtx.fillStyle = "black";
    this.rawPreviewCtx.fillRect(0, 0, this.rawVolumePreviewCanvas.nativeElement.width, this.rawVolumePreviewCanvas.nativeElement.height);

    this.rawPreviewCtx.fillStyle = "green";
    this.rawPreviewCtx.fillRect(0, this.rawVolumePreviewCanvas.nativeElement.height - (this.rawValue / 100 * this.rawVolumePreviewCanvas.nativeElement.height), this.rawVolumePreviewCanvas.nativeElement.width, this.rawVolumePreviewCanvas.nativeElement.height);

    this.rawPreviewCtx.fillStyle = "red";
    this.rawPreviewCtx.fillRect(0, this.rawVolumePreviewCanvas.nativeElement.height - (this.highThreshold / 100 * this.rawVolumePreviewCanvas.nativeElement.height), this.rawVolumePreviewCanvas.nativeElement.width, 1);

    this.rawPreviewCtx.fillStyle = "blue";
    const lowThresholdPosition = this.lowThreshold === 0 ? 1 : this.lowThreshold / 100 * this.rawVolumePreviewCanvas.nativeElement.height;
    this.rawPreviewCtx.fillRect(0, this.rawVolumePreviewCanvas.nativeElement.height - lowThresholdPosition, this.rawVolumePreviewCanvas.nativeElement.width, 1);

    // Draw adjusted
    this.adjustedPreviewCtx.fillStyle = "black";
    this.adjustedPreviewCtx.fillRect(0, 0, this.adjustedVolumePreviewCanvas.nativeElement.width, this.adjustedVolumePreviewCanvas.nativeElement.height);

    this.adjustedPreviewCtx.fillStyle = "green";
    this.adjustedPreviewCtx.fillRect(0, this.adjustedVolumePreviewCanvas.nativeElement.height - (this.adjustedValue / 100 * this.adjustedVolumePreviewCanvas.nativeElement.height), this.adjustedVolumePreviewCanvas.nativeElement.width, this.adjustedVolumePreviewCanvas.nativeElement.height);

    // Draw history graph for each value in history. each value is a pillar. width is calculated to make all pillars fit with a 2px spacing between each. pillars starts from right with the latest pushed value to the array
    this.historyGraphCtx.fillStyle = "black";
    this.historyGraphCtx.fillRect(0, 0, this.historyGraphCanvas.nativeElement.width, this.historyGraphCanvas.nativeElement.height);

    const pillarSpacing = 2;
    const pillarWidth = this.historyGraphCanvas.nativeElement.width / (this.historyLength * pillarSpacing);


    for (let i = 0; i < this.history.length; i++) {
      const value = this.history[i];
      const x = this.historyGraphCanvas.nativeElement.width - (i * (pillarWidth + pillarSpacing));
      const y = this.historyGraphCanvas.nativeElement.height - (value / 100 * this.historyGraphCanvas.nativeElement.height);

      // Finn with a gradient where the 0 is green and 100 is red in the height of the canvas
      const gradient = this.historyGraphCtx.createLinearGradient(0, 0, 0, this.historyGraphCanvas.nativeElement.height);
      gradient.addColorStop(0, "red");
      gradient.addColorStop(1, "green");
      this.historyGraphCtx.fillStyle = gradient;

      this.historyGraphCtx.fillRect(x, y, pillarWidth, this.historyGraphCanvas.nativeElement.height);
    }
  }

  sendConfig() {
    this.socket.sendMessage(SocketMessageType.C2S_AudioVisualiserSettings, {
      rawAmplification: this.rawAmplification,
      lowThreshold: this.lowThreshold,
      highThreshold: this.highThreshold,
    });
  }

  constructor(
    private socket: SocketService,
    private audioVisualizerApi: AudioVisualizerApiService,
    private toastr: ToastrService,
  ) { }

  rollback() {
    this.audioVisualizerApi.getSettings().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch audio visualizer settings");
        throw err;
      })
    ).subscribe(settings => {
      this._rawAmplification = settings.rawAmplification;
      this._lowThreshold = settings.lowThreshold;
      this._highThreshold = settings.highThreshold;
      this.sendConfig();
    });
  }

  saveSettings() {
    this.audioVisualizerApi.updateSettings({
      rawAmplification: this.rawAmplification,
      lowThreshold: this.lowThreshold,
      highThreshold: this.highThreshold,
    }).pipe(
      catchError(err => {
        this.toastr.error("Failed to save audio visualizer settings");
        throw err;
      })
    ).subscribe(() => {
      this.toastr.success("Settings saved");
    });
  }

  ngOnInit(): void {
    this.interval = setInterval(() => {
      this.socket.sendMessage(SocketMessageType.C2S_EnableAudioPreview, true);
    }, 2000);
    this.socket.sendMessage(SocketMessageType.C2S_EnableAudioPreview, true);

    this.audioSubscription = this.socket.messageObservable.subscribe(message => {
      if (message.type == SocketMessageType.S2C_RemoteAudioLevel) {
        this.rawValue = parseFloat(message.data) * this.rawAmplification;
        if (this.rawValue > 100) {
          this.rawValue = 100;
        }

        this.adjustedValue = toDecimal(this.rawValue, this.lowThreshold, this.highThreshold) * 100;

        this.history.push(this.adjustedValue);
        while (this.history.length > this.historyLength) {
          this.history.shift();
        }

        this.draw();
      }
    });

    this.audioVisualizerApi.getSettings().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch audio visualizer settings");
        throw err;
      })
    ).subscribe(settings => {
      this._rawAmplification = settings.rawAmplification;
      this._lowThreshold = settings.lowThreshold;
      this._highThreshold = settings.highThreshold;
    });
  }

  ngOnDestroy(): void {
    this.audioSubscription?.unsubscribe();
    clearInterval(this.interval);
    this.socket.sendMessage(SocketMessageType.C2S_EnableAudioPreview, false);
  }

  ngAfterViewInit(): void {
    this.rawPreviewCtx = this.rawVolumePreviewCanvas.nativeElement.getContext("2d")!;
    this.adjustedPreviewCtx = this.adjustedVolumePreviewCanvas.nativeElement.getContext("2d")!;
    this.historyGraphCtx = this.historyGraphCanvas.nativeElement.getContext("2d")!;
    this.draw();
  }
}

function toDecimal(value: number, min: number, max: number): number {
  if (min > max) {
    return 1.0;
  }

  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
