import { Component, input, output } from '@angular/core';
import { OverviewData } from '../../../../core/services/api/overview-api.service';

@Component({
  selector: 'app-dashboard-status-card',
  standalone: false,
  templateUrl: './dashboard-status-card.component.html',
  styleUrl: './dashboard-status-card.component.scss'
})
export class DashboardStatusCardComponent {
  readonly overview = input<OverviewData | null>(null);
  readonly toggleHud = output<void>();
}
