import { Component, EventEmitter, inject, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { RgbApiService, RgbEffect, RgbEffectInfo, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { catchError } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-rgb-effect-card',
  templateUrl: './rgb-effect-card.component.html',
  styleUrl: './rgb-effect-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class RgbEffectCardComponent {
  private readonly rgbApi = inject(RgbApiService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) effectList!: RgbEffectInfo[];
  @Input({ required: true }) scene!: RgbScene;
  @Input({ required: true }) effect!: RgbEffect;
  @Output() majorChange = new EventEmitter<void>();

  get description() {
    const effect = this.effectList.find(e => e.name == this.effect.name);
    return effect == null ? "" : effect.description;
  }

  handleDisplayNameChange() {
    if (this.effect.displayName.trim().length == 0) {
      this.toast.warning("Name cant be empty");
    }

    console.debug("New name: " + this.effect.displayName);
    this.rgbApi.updateEffect(this.scene.id, this.effect.id, {
      displayName: this.effect.displayName
    }).pipe(catchError(err => {
      this.toast.error("Failed to update effect name");
      throw err;
    })).subscribe();
  }

  remove() {
    this.rgbApi.removeEffect(this.scene.id, this.effect.id).pipe(catchError(err => {
      this.toast.error("Failed to remove effect");
      throw err;
    })).subscribe(() => {
      this.majorChange.emit();
    });
  }
}
