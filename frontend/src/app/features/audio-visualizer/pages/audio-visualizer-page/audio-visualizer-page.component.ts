import { Component, OnInit, OnDestroy, inject, signal, computed, viewChild, ElementRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { AudioVisualizerApiService, AudioVisualizerConfig, AudioVisualizerData, AudioDevice } from '../../../../core/services/api/audio-visualizer-api.service';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-audio-visualizer-page',
  templateUrl: './audio-visualizer-page.component.html',
  styleUrls: ['./audio-visualizer-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AudioVisualizerPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(AudioVisualizerApiService);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);

  // Canvas reference
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('spectrumCanvas');

  // State signals
  protected readonly config = signal<AudioVisualizerConfig>({ enabled: false, deviceIndex: null, lowThreshold: 0.02, intensity: 2.0 });
  protected readonly isRunning = signal<boolean>(false);
  protected readonly refreshRate = signal<number>(30);
  protected readonly devices = signal<AudioDevice[]>([]);
  protected readonly latestData = signal<AudioVisualizerData | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly saving = signal<boolean>(false);

  // Computed values
  protected readonly statusText = computed(() => {
    return this.isRunning() ? 'Running' : 'Stopped';
  });

  protected readonly statusClass = computed(() => {
    return this.isRunning() ? 'text-success' : 'text-danger';
  });

  // Canvas rendering
  private canvasContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastRenderTime = 0;
  private lastDataTimestamp = 0;

  constructor() {
    // Setup canvas rendering when canvas becomes available
    effect(() => {
      const canvas = this.canvasRef();
      if (canvas) {
        this.setupCanvas(canvas.nativeElement);
      }
    });
  }

  ngOnInit(): void {
    this.loadConfig();
    this.loadDevices();
    this.setupSocketListener();
  }

  ngOnDestroy(): void {
    this.socket.sendMessage(SocketMessageType.C2S_EnableAudioPreview, false);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.api.getConfig().subscribe({
      next: (response) => {
        this.config.set(response.config);
        this.isRunning.set(response.isRunning);
        if (response.refreshRate) {
          this.refreshRate.set(response.refreshRate);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load config:', err);
        this.toast.error('Failed to load audio visualizer config');
        this.loading.set(false);
        return [];
      }
    });
  }

  private loadDevices(): void {
    this.api.listDevices().subscribe({
      next: (response) => {
        this.devices.set(response.devices);
      },
      error: (err) => {
        console.error('Failed to load devices:', err);
        this.toast.error('Failed to load audio devices');
        return [];
      }
    });
  }

  private setupSocketListener(): void {
    // Enable audio preview
    this.socket.sendMessage(SocketMessageType.C2S_EnableAudioPreview, true);

    // Listen for audio data
    this.socket.messageObservable.subscribe((message) => {
      if (message.type === SocketMessageType.S2C_AudioVisualizerData) {
        this.latestData.set(message.data as AudioVisualizerData);
      }
    });
  }

  private setupCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.canvasContext = ctx;

    // Set canvas size
    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = 300;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Start rendering loop
    this.renderSpectrum();
  }

  private renderSpectrum(): void {
    if (!this.canvasContext) return;

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.renderSpectrum());

    const now = performance.now();
    const fps = this.refreshRate();
    const interval = 1000 / fps;

    if (now - this.lastRenderTime < interval) {
      return;
    }

    const data = this.latestData();
    if (!data || data.timestamp === this.lastDataTimestamp) {
      return;
    }

    this.lastRenderTime = now;
    this.lastDataTimestamp = data.timestamp;

    const canvas = this.canvasContext.canvas;
    const ctx = this.canvasContext;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bands = [
      ['SUB BASS', data.bands.sub_bass, '#8B00FF'],
      ['BASS', data.bands.bass, '#FF0080'],
      ['LOW MIDS', data.bands.low_mids, '#FF4500'],
      ['MIDS', data.bands.mids, '#FFD700'],
      ['HIGH MIDS', data.bands.high_mids, '#00FF00'],
      ['HIGHS', data.bands.highs, '#00BFFF'],
      ['PRESENCE', data.bands.presence, '#FF1493']
    ];

    const barWidth = canvas.width / bands.length;
    const barSpacing = 6;
    const activeHeight = canvas.height - 35; // Leave room for parameters labels and bottom text

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

    bands.forEach(([label, value, color], index) => {
      const val = value as number;
      const barHeight = val * activeHeight;
      const x = index * barWidth + barSpacing / 2;
      const y = canvas.height - 20 - barHeight;
      const w = barWidth - barSpacing;

      // Draw frequency bar
      ctx.fillStyle = color as string;
      ctx.fillRect(x, y, w, barHeight);

      // Draw bar border
      ctx.strokeRect(x, y, w, barHeight);

      // Draw label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label as string, index * barWidth + barWidth / 2, canvas.height - 5);
    });

    // Draw beat indicator overlay if beat is highlighted
    if (data.beat) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FF3333';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('BEAT', canvas.width - 15, 25);
    }

    // Draw overall intensity bar at the top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, canvas.width, 8);

    // Color code based on range limits
    ctx.fillStyle = data.intensity > 0.8 ? '#FF3333' : data.intensity > 0.5 ? '#FFFF33' : '#33FF33';
    ctx.fillRect(0, 0, canvas.width * data.intensity, 8);
  }

  protected onToggleEnabled(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const newEnabled = checkbox.checked;

    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: currentConfig.deviceIndex,
      lowThreshold: currentConfig.lowThreshold,
      intensity: currentConfig.intensity,
      enabled: newEnabled
    }).subscribe({
      next: (response) => {
        this.config.set(response.config);
        this.isRunning.set(response.isRunning);
        this.toast.success(newEnabled ? 'Audio visualizer enabled and started' : 'Audio visualizer disabled and stopped');
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Failed to update enabled state:', err);
        this.toast.error('Failed to update audio visualizer');
        checkbox.checked = !newEnabled;
        this.saving.set(false);
        return [];
      }
    });
  }

  protected onDeviceChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const currentConfig = this.config();
    const newDeviceIndex = value === 'null' ? null : parseInt(value);

    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: newDeviceIndex,
      lowThreshold: currentConfig.lowThreshold,
      intensity: currentConfig.intensity,
      enabled: currentConfig.enabled
    }).subscribe({
      next: (response) => {
        this.config.set(response.config);
        this.isRunning.set(response.isRunning);
        this.toast.success('Audio device updated');
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Failed to update device:', err);
        this.toast.error('Failed to update audio device');
        this.saving.set(false);
        return [];
      }
    });
  }

  protected onLowThresholdChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const val = parseFloat(input.value);

    this.config.set({
      ...currentConfig,
      lowThreshold: val
    });
  }

  protected onLowThresholdChangeEnd(event: Event): void {
    const input = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const val = parseFloat(input.value);

    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: currentConfig.deviceIndex,
      lowThreshold: val,
      intensity: currentConfig.intensity,
      enabled: currentConfig.enabled
    }).subscribe({
      next: (response) => {
        this.config.set(response.config);
        this.isRunning.set(response.isRunning);
        this.toast.success('Low threshold noise-gate updated');
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Failed to update low threshold:', err);
        this.toast.error('Failed to update low threshold');
        this.saving.set(false);
        return [];
      }
    });
  }

  protected onIntensityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const val = parseFloat(input.value);

    this.config.set({
      ...currentConfig,
      intensity: val
    });
  }

  protected onIntensityChangeEnd(event: Event): void {
    const input = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const val = parseFloat(input.value);

    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: currentConfig.deviceIndex,
      lowThreshold: currentConfig.lowThreshold,
      intensity: val,
      enabled: currentConfig.enabled
    }).subscribe({
      next: (response) => {
        this.config.set(response.config);
        this.isRunning.set(response.isRunning);
        this.toast.success('Intensity multiplier updated');
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Failed to update intensity multiplier:', err);
        this.toast.error('Failed to update intensity multiplier');
        this.saving.set(false);
        return [];
      }
    });
  }
}
