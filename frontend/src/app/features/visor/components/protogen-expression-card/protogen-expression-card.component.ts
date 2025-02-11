import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { FaceApiService, FaceExpression } from '../../../../core/services/api/face-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { uuidv7 } from 'uuidv7';

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

  private _uuid = uuidv7();
  lockInput = false;

  @ViewChild("deletePrompt") private deletePromptTemplate!: TemplateRef<any>;
  private deletePrompt?: NgbModalRef;

  get previewB64() {
    return this.expression.preview;
  }

  get componentId() {
    return "expression_" + this._uuid;
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
    this.faceApi.updateExpression(this.expression.data.uuid, {
      name: this.expression.data.name,
      mirrorImage: this.expression.data.mirrorImage,
      replaceColors: this.expression.data.replaceColors,
      flipLeftSide: this.expression.data.flipLeftSide,
      flipRightSide: this.expression.data.flipRightSide,
      image: this.expression.data.image,
    }).pipe(catchError(err => {
      this.toastr.error("Failed to save changes");
      throw err;
    })).subscribe(expression => {
      this.toastr.success("Changes saved");
      this.expression.preview = expression.preview;
    });
  }

  ngOnDestroy(): void {
    this.deletePrompt?.close();
  }

  constructor(
    private modal: NgbModal,
    private api: FaceApiService,
    private toastr: ToastrService,
    private faceApi: FaceApiService,
  ) { }
}
