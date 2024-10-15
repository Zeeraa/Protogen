import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RgbApiService, RgbEffect, RgbEffectInfo, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-rgb-effect-card',
  templateUrl: './rgb-effect-card.component.html',
  styleUrl: './rgb-effect-card.component.scss'
})
export class RgbEffectCardComponent {
  @Input({ required: true }) effectList!: RgbEffectInfo[];
  @Input({ required: true }) scene!: RgbScene;
  @Input({ required: true }) effect!: RgbEffect;
  @Output() onMajorChange = new EventEmitter<void>();

  get description() {
    const effect = this.effectList.find(e => e.name == this.effect.name);
    return effect == null ? "" : effect.description;
  }

  handleDisplayNameChange() {
    if (this.effect.displayName.trim().length == 0) {
      this.toastr.warning("NAme cant be empty");
    }

    console.debug("New name: " + this.effect.displayName);
    this.rgbApi.updateEffect(this.scene.id, this.effect.id, {
      displayName: this.effect.displayName
    }).pipe(catchError(err => {
      this.toastr.error("Failed to update effect name");
      throw err;
    })).subscribe(() => { });
  }

  remove() {
    this.rgbApi.removeEffect(this.scene.id, this.effect.id).pipe(catchError(err => {
      this.toastr.error("Failed to remove effect");
      throw err;
    })).subscribe(() => {
      this.onMajorChange.emit();
    });
  }

  constructor(
    private rgbApi: RgbApiService,
    private toastr: ToastrService,
  ) { }
}
