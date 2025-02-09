import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FaceApiService, FaceExpression } from '../../../../core/services/api/face-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AssetsApiService, BuiltInAsset } from '../../../../core/services/api/assets-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-protogen-face-editor',
  templateUrl: './protogen-face-editor.component.html',
  styleUrl: './protogen-face-editor.component.scss'
})
export class ProtogenFaceEditorComponent implements OnInit {
  faceExpressions: FaceExpression[] = [];
  assets: BuiltInAsset[] = [];
  defaultExpression = "";
  showEdit = false;

  @ViewChild("newExpressionPrompt") private newExpressionPromptTemplate!: TemplateRef<any>;
  private newExpressionPrompt: NgbModalRef | null = null;
  lockInputs = false;
  newExpressionForm = new FormGroup({
    name: new FormControl<string>(""),
    image: new FormControl<string | null>(null),
  })

  nameInvalid = false;
  nameInUse = false;

  imageMissing = false;

  constructor(
    private faceApi: FaceApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private assetsApi: AssetsApiService,
    private title: Title,
  ) { }

  isDefault(expression: FaceExpression) {
    return expression.data.uuid == this.defaultExpression;
  }

  defaultExpressionChanged(event: any) {
    const target = event.target as HTMLInputElement;
    let newVal: string | null = target.value;
    if (newVal.trim().length == 0) {
      newVal = null;
    }

    this.faceApi.updateSettings({
      defaultExpressionId: newVal,
    }).pipe(catchError(err => {
      this.toastr.error("Failed to update default expression");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Default expression updated");
    });
  }

  fetchData() {
    this.faceApi.getData().pipe(catchError(err => {
      this.toastr.error("Failed to fetch expressions");
      throw err;
    })).subscribe(data => {
      console.log(data);
      this.defaultExpression = data.defaultExpression || "";
      this.faceExpressions = data.expressions;
    });
  }

  ngOnInit(): void {
    this.title.setTitle("Face editor - Protogen");

    this.assetsApi.getAssets().pipe(catchError(err => {
      this.toastr.error("Failed to load built-in assets");
      throw err;
    })).subscribe(assets => {
      this.assets = assets;
    })

    this.fetchData();
  }

  openNewExpressionModal() {
    this.newExpressionForm.reset();

    this.newExpressionPrompt?.close();
    this.newExpressionPrompt = this.modal.open(this.newExpressionPromptTemplate, { size: "lg" });
  }

  expressionDeleted(expression: FaceExpression) {
    this.faceExpressions = this.faceExpressions.filter(e => e.data.uuid != expression.data.uuid);
  }

  addNewExpression() {
    const name = this.newExpressionForm.get("name")?.value;
    const image = this.newExpressionForm.get("image")?.value;

    this.imageMissing = false;
    this.nameInvalid = false;
    this.nameInUse = false;

    let missing = false;
    if (name == null || name.trim().length == 0) {
      missing = true;
      this.nameInvalid = true;
    }

    if (image == null || image.trim().length == 0) {
      missing = true;
      this.imageMissing = true;
    }

    // Checking these here to tell typescript that they are not null
    if (missing || name == null || image == null) {
      this.toastr.error("Please fill out all fields");
      return;
    }

    this.lockInputs = true;
    this.newExpressionForm.disable();
    this.faceApi.addExpression({
      name,
      image,
      mirrorImage: false,
      flipRightSide: false,
      flipLeftSide: false,
      replaceColors: false,
    }).pipe(catchError((err: HttpErrorResponse) => {
      this.lockInputs = false;
      this.newExpressionForm.enable();
      if (err.status === 409) {
        this.toastr.error("Name already in use");
        this.nameInUse = true;
      } else {
        this.toastr.error("Failed to add expression");
      }
      throw err;
    })).subscribe(expression => {
      this.lockInputs = false;
      this.newExpressionForm.enable();
      this.newExpressionPrompt?.close();
      this.faceExpressions.push(expression);
    });
  }
}
