import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RemoteApiService, RemoteProfile } from '../../../../core/services/api/remote-api.service';
import { uuidv7 } from 'uuidv7';
import { RemoteActionDataSet } from '../../pages/remote-settings-page/remote-settings-page.component';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-remote-profile-card',
  templateUrl: './remote-profile-card.component.html',
  styleUrl: './remote-profile-card.component.scss'
})
export class RemoteProfileCardComponent {
  @Input({ required: true }) profile!: RemoteProfile;
  @Input({ required: true }) actionDataSet!: RemoteActionDataSet;
  @Output() onDeleted = new EventEmitter<RemoteProfile>();
  editEnabled = false;
  private _componentId = uuidv7();

  enableEdit() {
    this.editEnabled = true;
  }

  get componentId() {
    return this._componentId;
  }

  //TODO: confirm
  deleteProfile() {
    this.api.deleteProfile(this.profile.id).pipe(catchError(err => {
      this.toastr.error("Failed to delete profile");
      throw err;
    })).subscribe(() => {
      this.onDeleted.emit(this.profile);
    });
  }

  undoEdit() {
    this.api.getProfiles().pipe(catchError(err => {
      this.toastr.error("Failed to fetch original profile");
      throw err;
    })).subscribe(profiles => {
      const profile = profiles.find(p => p.id == this.profile.id);

      if (profile == null) {
        this.toastr.error("Profile not found");
        return;
      }

      this.profile.clickToActivate = profile.clickToActivate;
      this.profile.actions = profile.actions;
      this.profile.name = profile.name;
      this.editEnabled = false;
    });
  }

  constructor(
    private toastr: ToastrService,
    private api: RemoteApiService,
  ) { }
}
