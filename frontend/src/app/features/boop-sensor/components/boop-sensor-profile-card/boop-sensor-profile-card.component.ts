import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-boop-sensor-profile-card',
  standalone: false,
  templateUrl: './boop-sensor-profile-card.component.html',
  styleUrl: './boop-sensor-profile-card.component.scss'
})
export class BoopeSensorProfileCardComponent {
  private readonly boopSensorApi = inject(BoopSensorApiService);
  private readonly toastr = inject(ToastrService);

  @Input({ required: true }) profile!: BoopSensorProfile;
  @Input() active = false;
  @Output() profileActivated = new EventEmitter<BoopSensorProfile>();

  activate() {
    this.boopSensorApi.activateProfile(this.profile.id).pipe(catchError((err) => {
      console.error('Failed to activate profile', err);
      this.toastr.error("Failed to activate profile");
      return [];
    })).subscribe(() => {
      this.toastr.success("Profile activated");
      this.profileActivated.next(this.profile);
    });
  }
}
