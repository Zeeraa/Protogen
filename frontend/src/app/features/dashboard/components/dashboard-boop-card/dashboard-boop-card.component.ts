import { Component, input, output } from '@angular/core';
import { BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';

@Component({
  selector: 'app-dashboard-boop-card',
  standalone: false,
  templateUrl: './dashboard-boop-card.component.html',
  styleUrl: './dashboard-boop-card.component.scss'
})
export class DashboardBoopCardComponent {
  readonly enabled = input<boolean>(false);
  readonly profiles = input.required<BoopSensorProfile[]>();
  readonly activeProfileId = input<string | null>(null);
  readonly toggleEnabled = output<void>();
  readonly activateProfile = output<BoopSensorProfile>();
  readonly deactivateProfile = output<void>();
}
