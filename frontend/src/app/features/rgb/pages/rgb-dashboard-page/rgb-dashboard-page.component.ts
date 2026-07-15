import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastService } from 'ngx-yet-another-toast-library';
import { catchError } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { SystemConfigService } from '../../../../core/services/system-config.service';

@Component({
  selector: 'app-rgb-dashboard-page',
  templateUrl: './rgb-dashboard-page.component.html',
  styleUrl: './rgb-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class RgbDashboardPageComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly rgbApi = inject(RgbApiService);
  private readonly title = inject(Title);
  protected readonly systemConfig = inject(SystemConfigService);

  scenes: RgbScene[] = [];

  get rgbEnabled() {
    return this.systemConfig.features()?.rgb ?? true;
  }

  addBlank() {
    this.rgbApi.createNewScene("New scene").pipe(catchError(err => {
      this.toast.error("Failed to create new scene");
      throw err;
    })).subscribe((scene) => {
      this.scenes.push(scene);
      this.toast.success("Scene created");
    });
  }

  disable() {
    this.rgbApi.deactivate().pipe(catchError(err => {
      this.toast.error("Failed to disable rgb");
      throw err;
    })).subscribe(() => {
      this.toast.success("RGB Disabled");
    });
  }

  loadEffects() {
    this.rgbApi.getScenes().pipe(catchError(err => {
      this.toast.error("Failed to fetch scenes. Try reloading the page");
      throw err;
    })).subscribe(scenes => {
      this.scenes = scenes;
    });
  }

  ngOnInit(): void {
    this.title.setTitle("RGB Light management - Protogen");
    if (this.rgbEnabled) {
      this.loadEffects();
    }
  }
}
