import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { FaceApiService, FaceExpression } from '../../../../core/services/api/face-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-protogen-expression-card',
    templateUrl: './protogen-expression-card.component.html',
    styleUrl: './protogen-expression-card.component.scss',
    standalone: false
})
export class ProtogenExpressionCardComponent implements OnDestroy {
  @Input({ required: true }) expression!: FaceExpression;
  @Input() isDefault = false;
  @Input() showEdit = false;

  @Output() deleted = new EventEmitter<void>();

  lockInput = false;

  @ViewChild("deletePrompt") private deletePromptTemplate!: TemplateRef<any>;
  private deletePrompt?: NgbModalRef;

  get previewB64() {
    return this.expression.preview;
  }

  activate() {
    this.api.activateExpression(this.expression.data.uuid).pipe(catchError(err => {
      this.toastr.error("Failed to activate expression");
      throw err;
    })).subscribe();
  }

  showDeletePrompt() {
    this.deletePrompt?.close();
    this.deletePrompt = this.modal.open(this.deletePromptTemplate);
  }

  confirmDelete() {
    this.lockInput = true;
    this.api.deleteExpression(this.expression.data.uuid).pipe(catchError(err => {
      this.toastr.error("Failed to delete expression");
      this.deletePrompt?.close();
      this.lockInput = false;
      throw err;
    })).subscribe(() => {
      this.lockInput = false;
      this.deletePrompt?.close();
      this.deleted.emit();
    });
  }

  saveChanges() {
    console.log("not implemented");
  }

  ngOnDestroy(): void {
    this.deletePrompt?.close();
  }

  constructor(
    private modal: NgbModal,
    private api: FaceApiService,
    private toastr: ToastrService,
  ) { }
}
