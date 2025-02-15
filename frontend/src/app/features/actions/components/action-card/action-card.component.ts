import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { Action, ActionApiService, ActionSet } from '../../../../core/services/api/action-api.service';
import { uuidv7 } from 'uuidv7';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';
import { ActionType } from '../../../../core/enum/ActionType';

@Component({
  selector: 'app-action-card',
  standalone: false,
  templateUrl: './action-card.component.html',
  styleUrl: './action-card.component.scss'
})
export class ActionCardComponent implements OnDestroy {
  @Input({ required: true }) actionSet!: ActionSet;
  @Input({ required: true }) actionDataSet!: ActionDataSet;
  @Input() editEnabled = false;

  @Output() revertChanged = new EventEmitter<ActionSet>();
  @Output() deleted = new EventEmitter<ActionSet>();

  @ViewChild("deleteActionPrompt") private deletePromptTemplate!: TemplateRef<any>;
  private deletePrompt?: NgbModalRef;

  @ViewChild("undoChangesPrompt") private undoEditPromptTemplate!: TemplateRef<any>;
  private undoEditPrompt?: NgbModalRef;

  private _componentId = uuidv7();
  private _virtualIdCounter = 0;

  protected lockInputs = false;
  protected nameEmpty = false;
  protected nameTaken = false;

  constructor(
    private modal: NgbModal,
    private actionApi: ActionApiService,
    private toastr: ToastrService,
  ) { }

  ngOnDestroy(): void {
    this.deletePrompt?.close();
    this.undoEditPrompt?.close();
  }

  protected get componentId() {
    return this._componentId;
  }

  protected get invalidNameLabel() {
    return this._componentId + "_invalidName";
  }

  public enableEdit() {
    this.editEnabled = true;
  }

  showDeletePrompt() {
    this.deletePrompt?.close();
    this.deletePrompt = this.modal.open(this.deletePromptTemplate);
  }

  undoEdit() {
    this.undoEditPrompt?.close();
    this.undoEditPrompt = this.modal.open(this.undoEditPromptTemplate);
  }

  addAction() {
    this.actionSet.actions.push({
      virtualId: this._virtualIdCounter,
      action: "",
      type: ActionType.NONE,
    });
    this._virtualIdCounter++;
  }

  activate() {
    this.actionApi.activateActionSet(this.actionSet.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to activate action");
        throw err;
      })
    ).subscribe();
  }

  protected confirmDelete() {
    this.actionApi.deleteActionSet(this.actionSet.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to delete action");
        throw err;
      })
    ).subscribe(() => {
      this.deletePrompt?.close();
      this.deleted.emit(this.actionSet);
    });
  }

  protected actionDeleted(action: Action) {
    if (action.id != null) {
      this.actionSet.actions = this.actionSet.actions.filter(a => a.id != action.id);
    } else if (action.virtualId != null) {
      this.actionSet.actions = this.actionSet.actions.filter(a => a.virtualId != action.virtualId);
    } else {
      console.error("Action deleted without ID or virtual ID");
    }
  }

  protected confirmUndoEdit() {
    this.undoEditPrompt?.close();
    this.editEnabled = false;
    this.revertChanged.emit(this.actionSet);
  }

  protected save() {
    this.nameEmpty = false;
    this.nameTaken = false;

    if (this.actionSet.name.trim().length == 0) {
      this.nameEmpty = true;
    }

    this.lockInputs = true;
    this.actionApi.editActionSet(this.actionSet.id, {
      name: this.actionSet.name,
      actions: this.actionSet.actions,
      showOnDashboard: this.actionSet.showOnDashboard,
    }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;

        if (err.status == 409) {
          this.toastr.error("Name already in use by another action");
          this.nameTaken = true;
        } else {
          this.toastr.error("Failed to update action");
        }
        throw err;
      })
    ).subscribe(() => {
      this.lockInputs = false;
      this.editEnabled = false;
      this.toastr.success("Action saved");
    });
  }
}
