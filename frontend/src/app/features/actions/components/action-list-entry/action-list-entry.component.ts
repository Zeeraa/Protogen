import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Action } from '../../../../core/services/api/action-api.service';
import { ActionType, translateActionType } from '../../../../core/enum/ActionType';
import { uuidv7 } from 'uuidv7';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';

@Component({
  selector: 'tr[action-list-entry]',
  standalone: false,
  templateUrl: './action-list-entry.component.html',
  styleUrl: './action-list-entry.component.scss'
})
export class ActionListEntryComponent {
  @Input({ required: true }) action!: Action;
  @Input({ required: true }) actionDataSet!: ActionDataSet;
  @Input() disabled = false;

  @Output() deleted = new EventEmitter<Action>();

  private _componentId = uuidv7();

  get componentId() {
    return this._componentId;
  }

  get actionTypeAsString() {
    return String(this.action.type);
  }

  protected translateActionName(action: ActionType) {
    return translateActionType(action);
  }

  protected get actionList() {
    return Object.values(ActionType);
  }

  protected deleteAction() {
    this.deleted.emit(this.action);
  }
}
