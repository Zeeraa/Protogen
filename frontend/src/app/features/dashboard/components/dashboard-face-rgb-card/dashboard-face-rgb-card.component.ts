import { Component, inject, Input } from '@angular/core';
import { FaceApiService, FaceColorEffect } from '../../../../core/services/api/face-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-dashboard-face-rgb-card',
  standalone: false,
  templateUrl: './dashboard-face-rgb-card.component.html',
  styleUrl: './dashboard-face-rgb-card.component.scss'
})
export class DashboardFaceRgbCardComponent {
  private readonly faceApi = inject(FaceApiService);
  private readonly toastr = inject(ToastrService);

  @Input({ required: true }) effect!: FaceColorEffect;

  activate() {
    this.faceApi.activateColorEffect(this.effect.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to activate effect");
        throw err;
      })
    ).subscribe();
  }
}
