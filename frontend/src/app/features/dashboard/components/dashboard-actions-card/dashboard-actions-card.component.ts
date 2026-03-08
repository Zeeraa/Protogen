import { Component, input, output } from '@angular/core';
import { ActionSet } from '../../../../core/services/api/action-api.service';

@Component({
  selector: 'app-dashboard-actions-card',
  standalone: false,
  templateUrl: './dashboard-actions-card.component.html',
  styleUrl: './dashboard-actions-card.component.scss'
})
export class DashboardActionsCardComponent {
  readonly actions = input.required<ActionSet[]>();
  readonly activate = output<ActionSet>();
}
