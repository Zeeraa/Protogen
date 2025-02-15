import { Component, Input } from '@angular/core';
import { ActionApiService, ActionSet } from '../../../../core/services/api/action-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-dashboard-action-card',
  standalone: false,
  templateUrl: './dashboard-action-card.component.html',
  styleUrl: './dashboard-action-card.component.scss'
})
export class DashboardActionCardComponent {
  @Input({ required: true }) action!: ActionSet;

  constructor(
    private actionApi: ActionApiService,
    private toastr: ToastrService,
  ) { }

  activate() {
    this.actionApi.activateActionSet(this.action.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to activate action");
        throw err;
      })
    ).subscribe();
  }
}
