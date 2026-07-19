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
  protected readonly config = signal<AudioVisualizerConfig>({ enabled: false, deviceIndex: null, sensitivity: 1.5 });
  protected readonly isRunning = signal<boolean>(false);
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

  protected readonly musicStyleText = computed(() => {
    const data = this.latestData();
    if (!data) return 'No data';

    switch (data.style) {
      case 'bass_heavy': return 'Bass Heavy';
      case 'vocal': return 'Vocal';
      case 'bright': return 'Bright';
      case 'balanced': return 'Balanced';
      case 'quiet': return 'Quiet';
      case 'silence': return 'Silence';
      default: return data.style;
    }
  });

  // Canvas rendering
  private canvasContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  // Band colors
  private readonly bandColors = {
    sub_bass: '#8B00FF',    // Purple
    bass: '#FF0080',        // Pink
    low_mids: '#FF4500',    // Orange-red
    mids: '#FFD700',        // Gold
    high_mids: '#00FF00',   // Green
    highs: '#00BFFF',       // Deep sky blue
    presence: '#FF1493'     // Deep pink
  };

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

    const canvas = this.canvasContext.canvas;
    const ctx = this.canvasContext;
    const data = this.latestData();

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (data) {
      const bands = Object.entries(data.bands);
      const barWidth = canvas.width / bands.length;
      const barSpacing = 4;

      bands.forEach(([name, value], index) => {
        const barHeight = value * (canvas.height - 20);
        const x = index * barWidth;
        const y = canvas.height - barHeight;

        // Draw bar
        ctx.fillStyle = this.bandColors[name as keyof typeof this.bandColors];
        ctx.fillRect(x + barSpacing / 2, y, barWidth - barSpacing, barHeight);

        // Draw bar outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(x + barSpacing / 2, y, barWidth - barSpacing, barHeight);

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const label = name.replace(/_/g, ' ').toUpperCase();
        ctx.fillText(label, x + barWidth / 2, canvas.height - 5);
      });

      // Draw beat indicator
      if (data.beat) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('BEAT', canvas.width - 10, 30);
      }

      // Draw intensity bar at top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, 10);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#00FF00');
      gradient.addColorStop(0.5, '#FFFF00');
      gradient.addColorStop(1, '#FF0000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width * data.intensity, 10);
    }

    // Continue rendering
    this.animationFrameId = requestAnimationFrame(() => this.renderSpectrum());
  }

  protected onToggleEnabled(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const newEnabled = checkbox.checked;

    // Immediately save the enabled state
    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: currentConfig.deviceIndex,
      sensitivity: currentConfig.sensitivity,
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
        // Revert checkbox on error
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

    // Immediately save the device change
    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: newDeviceIndex,
      sensitivity: currentConfig.sensitivity,
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

  protected onSensitivityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const newSensitivity = parseFloat(input.value);

    // Update local state immediately for responsive UI
    this.config.set({
      ...currentConfig,
      sensitivity: newSensitivity
    });
  }

  protected onSensitivityChangeEnd(event: Event): void {
    // Save when user releases the slider
    const input = event.target as HTMLInputElement;
    const currentConfig = this.config();
    const newSensitivity = parseFloat(input.value);

    this.saving.set(true);
    this.api.updateConfig({
      deviceIndex: currentConfig.deviceIndex,
      sensitivity: newSensitivity,
      enabled: currentConfig.enabled
    }).subscribe({
      next: (response) => {
        this.config.set(response.config);
        this.isRunning.set(response.isRunning);
        this.toast.success('Sensitivity updated');
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Failed to update sensitivity:', err);
        this.toast.error('Failed to update sensitivity');
        this.saving.set(false);
        return [];
      }
    });
  }
}
