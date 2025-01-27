import { Component, Input } from '@angular/core';
import { RemoteProfile } from '../../../../core/services/api/remote-api.service';
import { uuidv7 } from 'uuidv7';
import { RemoteActionDataSet } from '../../pages/remote-settings-page/remote-settings-page.component';

@Component({
  selector: 'app-remote-profile-card',
  templateUrl: './remote-profile-card.component.html',
  styleUrl: './remote-profile-card.component.scss'
})
export class RemoteProfileCardComponent {
  @Input({ required: true }) profile!: RemoteProfile;
  @Input({ required: true }) actionDataSet!: RemoteActionDataSet;
  editEnabled = false;
  private _componentId = uuidv7();

  enableEdit() {
    this.editEnabled = true;
  }

  get componentId() {
    return this._componentId;
  }
}
