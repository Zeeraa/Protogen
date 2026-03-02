import { Component, inject, Input } from '@angular/core';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-rgb-scene-card',
  templateUrl: './rgb-scene-card.component.html',
  styleUrl: './rgb-scene-card.component.scss',
  standalone: false
})
export class RgbSceneCardComponent {
  private readonly api = inject(RgbApiService);
  private readonly toastr = inject(ToastrService);

  @Input({ required: true }) scene!: RgbScene;

  get effectCount() {
    return this.scene.effects.length;
  }

  activate() {
    this.api.activateScene(this.scene.id).pipe(catchError(err => {
      this.toastr.error("Failed to activate scene");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Scene activated");
    });
  }
}
