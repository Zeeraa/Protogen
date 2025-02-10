import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { FaceApiService, FaceColorEffect, FaceColorEffectType } from '../../../../core/services/api/face-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-face-color-effect-card',
  templateUrl: './face-color-effect-card.component.html',
  styleUrl: './face-color-effect-card.component.scss'
})
export class FaceColorEffectCardComponent implements OnDestroy {
  @Input({ required: true }) effect!: FaceColorEffect;
  @Input({ required: true }) effectTypes!: FaceColorEffectType[];
  @Input() showEdit = false;
  @Input() lockInputs = false;

  @Output() deleted = new EventEmitter<FaceColorEffect>();

  @ViewChild('deletePrompt') deletePromptTemplate!: TemplateRef<any>;
  private deletePromptModa?: NgbModalRef;

  constructor(
    private api: FaceApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
  ) { }

  get effectTypeDescription() {
    return this.effectTypes.find(t => t.name == this.effect.type)?.description || "Unknown type";

  }

  ngOnDestroy(): void {
    this.deletePromptModa?.close();
  }

  activate() {
    this.api.activateColorEffect(this.effect.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to activate effect");
        throw err;
      })
    ).subscribe(() => {
      this.toastr.success("Effect activated");
    });
  }

  handleDisplayNameChange() {
    this.api.updateEffect(this.effect.id, {
      name: this.effect.name,
    }).pipe(
      catchError(err => {
        this.toastr.error("Failed to update effect");
        throw err;
      })
    ).subscribe(() => {
      this.toastr.success("Effect updated");
    });
  }

  showDeletePrompt() {
    this.deletePromptModa?.close();
    this.deletePromptModa = this.modal.open(this.deletePromptTemplate);
  }

  confirmDelete() {
    this.api.removeColorEffect(this.effect.id).pipe(
      catchError(err => {
        this.toastr.error("Failed to remove effect");
        throw err;
      })
    ).subscribe(() => {
      this.toastr.success("Effect removed");
      this.deleted.emit(this.effect);
      this.deletePromptModa?.close();
    });
  }
}
