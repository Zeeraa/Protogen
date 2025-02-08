import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FaceApiService, FaceExpression } from '../../../../core/services/api/face-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AssetsApiService, BuiltInAsset } from '../../../../core/services/api/assets-api.service';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-protogen-face-editor',
  templateUrl: './protogen-face-editor.component.html',
  styleUrl: './protogen-face-editor.component.scss'
})
export class ProtogenFaceEditorComponent implements OnInit {
  faceExpressions: FaceExpression[] = [];
  assets: BuiltInAsset[] = [];
  defaultExpression = "";

  @ViewChild("newExpressionPrompt") private newExpressionPromptTemplate!: TemplateRef<any>;
  private newExpressionPrompt: NgbModalRef | null = null;
  lockInputs = false;
  newExpressionForm = new FormGroup({
    name: new FormControl<string>(""),
  })

  constructor(
    private faceApi: FaceApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private assetsApi: AssetsApiService,
  ) { }

  isDefault(expression: FaceExpression) {
    return expression.data.uuid == this.defaultExpression;
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
    this.assetsApi.getAssets().pipe(catchError(err => {
      this.toastr.error("Failed to load built-in assets");
      throw err;
    })).subscribe(assets => {
      this.assets = assets;
    })

    this.fetchData();
  }

  openNewExpressionModal() {
    this.newExpressionPrompt?.close();
    this.newExpressionPrompt = this.modal.open(this.newExpressionPromptTemplate);
  }

  addNewExpression() {

  }

}
