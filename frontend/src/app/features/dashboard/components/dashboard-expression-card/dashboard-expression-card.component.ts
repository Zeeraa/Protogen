import { Component, inject, Input } from '@angular/core';
import { FaceApiService, FaceExpression } from '../../../../core/services/api/face-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-dashboard-expression-card',
  standalone: false,
  templateUrl: './dashboard-expression-card.component.html',
  styleUrl: './dashboard-expression-card.component.scss'
})
export class DashboardExpressionCardComponent {
  private readonly faceApi = inject(FaceApiService);
  private readonly toastr = inject(ToastrService);

  @Input({ required: true }) expression!: FaceExpression;

  get previewB64() {
    return this.expression.preview;
  }

  activate() {
    this.faceApi.activateExpression(this.expression.data.uuid, true).pipe(
      catchError(err => {
        this.toastr.error("Failed to activate expression");
        throw err;
      })
    ).subscribe();
  }
}
