import { Component, Input } from '@angular/core';
import { ActionType, translateActionType } from '../../../../core/enum/ActionType';
import { GamepadActionTrigger, translateTriggerName } from '../../../../core/services/api/gamepad-api.service';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';
import { uuidv7 } from 'uuidv7';

export interface EditableTriggerRow {
  trigger: GamepadActionTrigger;
  actionType: ActionType;
  action: string | null;
}

@Component({
  selector: 'tr[gamepad-trigger-row]',
  standalone: false,
  templateUrl: './gamepad-trigger-row.component.html',
  styleUrl: './gamepad-trigger-row.component.scss',
})
export class GamepadTriggerRowComponent {
  @Input({ required: true }) row!: EditableTriggerRow;
  @Input({ required: true }) actionDataSet!: ActionDataSet;
  @Input() disabled = false;

  private readonly _componentId = uuidv7();

  protected readonly ActionType = ActionType;

  protected get componentId() {
    return this._componentId;
  }

  protected get triggerLabel() {
    return translateTriggerName(this.row.trigger);
  }

  protected get actionTypeList() {
    return Object.values(ActionType);
  }

  protected translateActionType(type: ActionType) {
    return translateActionType(type);
  }
}
