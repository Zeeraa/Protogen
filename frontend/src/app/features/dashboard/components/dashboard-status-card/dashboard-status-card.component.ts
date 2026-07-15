import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { OverviewData } from '../../../../core/services/api/overview-api.service';
import { SystemConfigService } from '../../../../core/services/system-config.service';

@Component({
  selector: 'app-dashboard-status-card',
  standalone: false,
  templateUrl: './dashboard-status-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard-status-card.component.scss'
})
export class DashboardStatusCardComponent {
  readonly overview = input<OverviewData | null>(null);
  readonly toggleHud = output<void>();
  protected readonly systemConfig = inject(SystemConfigService);
}
