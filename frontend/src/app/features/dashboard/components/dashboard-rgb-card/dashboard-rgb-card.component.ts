import { Component, Input } from '@angular/core';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-dashboard-rgb-card',
  standalone: false,
  templateUrl: './dashboard-rgb-card.component.html',
  styleUrl: './dashboard-rgb-card.component.scss'
})
export class DashboardRgbCardComponent {
  @Input({ required: true }) scene!: RgbScene;

  constructor(
    private rgbApi: RgbApiService,
    private toastr: ToastrService,
  ) { }

  activate() {
    this.rgbApi.activateScene(this.scene.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to activate scene");
        throw err;
      })
    ).subscribe();
  }
}
