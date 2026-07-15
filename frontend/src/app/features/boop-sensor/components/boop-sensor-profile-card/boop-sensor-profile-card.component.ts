import { Component, EventEmitter, inject, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { catchError } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-boop-sensor-profile-card',
  standalone: false,
  templateUrl: './boop-sensor-profile-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './boop-sensor-profile-card.component.scss'
})
export class BoopeSensorProfileCardComponent {
  private readonly boopSensorApi = inject(BoopSensorApiService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) profile!: BoopSensorProfile;
  @Input() active = false;
  @Output() profileActivated = new EventEmitter<BoopSensorProfile>();

  activate() {
    this.boopSensorApi.activateProfile(this.profile.id).pipe(catchError((err) => {
      console.error('Failed to activate profile', err);
      this.toast.error("Failed to activate profile");
      return [];
    })).subscribe(() => {
      this.toast.success("Profile activated");
      this.profileActivated.next(this.profile);
    });
  }
}
