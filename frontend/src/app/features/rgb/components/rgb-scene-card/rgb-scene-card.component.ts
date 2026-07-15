import { Component, inject, Input, ChangeDetectionStrategy } from '@angular/core';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastService } from 'ngx-yet-another-toast-library';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-rgb-scene-card',
  templateUrl: './rgb-scene-card.component.html',
  styleUrl: './rgb-scene-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class RgbSceneCardComponent {
  private readonly api = inject(RgbApiService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) scene!: RgbScene;

  get effectCount() {
    return this.scene.effects.length;
  }

  activate() {
    this.api.activateScene(this.scene.id).pipe(catchError(err => {
      this.toast.error("Failed to activate scene");
      throw err;
    })).subscribe(() => {
      this.toast.success("Scene activated");
    });
  }
}
