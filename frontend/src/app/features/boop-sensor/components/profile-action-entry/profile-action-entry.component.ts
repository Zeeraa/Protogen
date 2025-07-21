import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BoopSensorAction } from '../../../../core/services/api/boop-sensor-api.service';
import { uuidv7 } from 'uuidv7';
import { ActionType, translateActionType } from '../../../../core/enum/ActionType';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';

@Component({
  selector: 'tr[appProfileActionEntry]',
  standalone: false,
  templateUrl: './profile-action-entry.component.html',
  styleUrl: './profile-action-entry.component.scss'
})
export class ProfileActionEntryComponent {
  @Input({ required: true }) action!: BoopSensorAction;
  @Input() disabled = false;
  @Input({ required: true }) actionDataSet!: ActionDataSet;

  @Output() deleteAction = new EventEmitter<BoopSensorAction>();

  protected readonly componentId = uuidv7();

  protected get actionList() {
    return Object.values(ActionType);
  }

  protected get actionTypeAsString() {
    return String(this.action.actionType);
  }

  protected translateActionName(action: ActionType) {
    return translateActionType(action);
  }

  deleteEntry() {
    this.deleteAction.next(this.action);
  }
}
