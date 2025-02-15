import { Component, Input, OnInit } from '@angular/core';
import { RemoteAction, RemoteProfile, translateRemoteInputType } from '../../../../core/services/api/remote-api.service';
import { uuidv7 } from 'uuidv7';
import { ActionType, translateActionType } from '../../../../core/enum/ActionType';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';

@Component({
  selector: 'app-remote-action-editor',
  templateUrl: './remote-action-editor.component.html',
  styleUrl: './remote-action-editor.component.scss',
  standalone: false
})
export class RemoteActionEditorComponent implements OnInit {
  @Input({ required: true }) profile!: RemoteProfile;
  @Input({ required: true }) action!: RemoteAction;
  @Input({ required: true }) actionDataSet!: ActionDataSet;
  @Input({ required: true }) disabled!: boolean;
  private _componentId = uuidv7();

  get inputTypeString() {
    return translateRemoteInputType(this.action.inputType);
  }

  translateActionName(action: ActionType) {
    return translateActionType(action);
  }

  get actionList() {
    return Object.values(ActionType);
  }

  get componentId() {
    return this._componentId;
  }

  get actionTypeAsString() {
    return String(this.action.actionType);
  }

  ngOnInit(): void {
    console.debug("Action " + this.action.id + " mapped to " + this.action.inputType + " has an action of " + this.action.actionType + " with input " + this.action.action);
  }

  stringify(input: any) {
    return String(input);
  }
}
