import { Component, input, output } from '@angular/core';
import { RgbScene } from '../../../../core/services/api/rgb-api.service';

@Component({
  selector: 'app-dashboard-rgb-card',
  standalone: false,
  templateUrl: './dashboard-rgb-card.component.html',
  styleUrl: './dashboard-rgb-card.component.scss'
})
export class DashboardRgbCardComponent {
  readonly scenes = input.required<RgbScene[]>();
  readonly activeSceneId = input<string | null>(null);
  readonly activate = output<RgbScene>();
  readonly disable = output<void>();
}
