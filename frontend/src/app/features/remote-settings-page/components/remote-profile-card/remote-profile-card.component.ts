import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { AlterProfileActions, RemoteApiService, RemoteProfile } from '../../../../core/services/api/remote-api.service';
import { uuidv7 } from 'uuidv7';
import { RemoteActionDataSet } from '../../pages/remote-settings-page/remote-settings-page.component';
import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-remote-profile-card',
    templateUrl: './remote-profile-card.component.html',
    styleUrl: './remote-profile-card.component.scss',
    standalone: false
})
export class RemoteProfileCardComponent implements OnDestroy {
  @Input({ required: true }) profile!: RemoteProfile;
  @Input({ required: true }) actionDataSet!: RemoteActionDataSet;
  @Input() isActive = false;
  @Output() deleted = new EventEmitter<RemoteProfile>();
  editEnabled = false;

  private _componentId = uuidv7();

  private deleteProfilePrompt: NgbModalRef | null = null;
  private undoChangesPrompt: NgbModalRef | null = null;

  @ViewChild("deleteProfilePrompt") private deleteProfilePromptTemplate!: TemplateRef<any>;
  @ViewChild("undoChangesPrompt") private undoChangesPromptTemplate!: TemplateRef<any>;

  lockInputs = false;
  nameEmpty = false;
  nameTaken = false;

  enableEdit() {
    this.editEnabled = true;
  }

  get componentId() {
    return this._componentId;
  }

  deleteProfile() {
    this.lockInputs = false;
    this.deleteProfilePrompt?.close();
    this.deleteProfilePrompt = this.modal.open(this.deleteProfilePromptTemplate);
  }

  confirmDelete() {
    this.lockInputs = true;
    this.api.deleteProfile(this.profile.id).pipe(catchError(err => {
      this.lockInputs = false;
      this.toastr.error("Failed to delete profile");
      this.deleteProfilePrompt?.close();
      throw err;
    })).subscribe(() => {
      this.lockInputs = false;
      this.deleteProfilePrompt?.close();
      this.toastr.success("Profile deleted");
      this.deleted.emit(this.profile);
    });
  }

  undoEdit() {
    this.lockInputs = false;
    this.undoChangesPrompt?.close();
    this.undoChangesPrompt = this.modal.open(this.undoChangesPromptTemplate);
  }

  confirmUndoEdit() {
    this.lockInputs = true;
    this.api.getProfiles().pipe(catchError(err => {
      this.undoChangesPrompt?.close();
      this.toastr.error("Failed to fetch original profile");
      this.lockInputs = false;
      throw err;
    })).subscribe(profiles => {
      this.undoChangesPrompt?.close();

      const profile = profiles.find(p => p.id == this.profile.id);

      if (profile == null) {
        this.toastr.error("Profile not found");
        return;
      }

      this.profile.clickToActivate = profile.clickToActivate;
      this.profile.actions = profile.actions;
      this.profile.name = profile.name;
      this.editEnabled = false;
      this.lockInputs = false;
    });
  }

  save() {
    const actions: AlterProfileActions[] = [];
    this.profile.actions.forEach(action => {
      actions.push({
        action: action.action,
        actionType: action.actionType,
        inputType: action.inputType,
        id: action.id,
      });
    });

    this.nameEmpty = false;
    this.nameTaken = false;

    if (this.profile.name.trim().length == 0) {
      this.nameEmpty = true;
      return;
    }

    this.lockInputs = true;
    this.api.alterProfile(this.profile.id, {
      name: this.profile.name,
      clickToActivate: this.profile.clickToActivate,
      actions: actions,
    }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;

        if (err.status == 409) {
          this.toastr.error("Name already in use by other profile");
          this.nameTaken = true;
          return of(null);
        }

        this.toastr.error("Failed to update profile");
        throw err;
      })
    ).subscribe(profile => {
      if (profile == null) {
        return;
      }

      this.profile.name = profile.name;
      this.profile.clickToActivate = profile.clickToActivate;
      this.profile.actions = profile.actions;

      this.lockInputs = false;
      this.toastr.success("Profile saved");
      console.debug(profile);
    })
  }

  stringify(input: any) {
    return String(input);
  }

  ngOnDestroy(): void {
    this.deleteProfilePrompt?.close();
    this.undoChangesPrompt?.close();
  }

  get invalidNameLabel() {
    return "invalidName_" + this.componentId;
  }

  constructor(
    private toastr: ToastrService,
    private api: RemoteApiService,
    private modal: NgbModal,
  ) { }
}
