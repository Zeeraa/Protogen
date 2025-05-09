import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FaceApiService, FaceColorEffect, FaceColorEffectType, FaceExpression } from '../../../../core/services/api/face-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AssetsApiService, BuiltInAsset } from '../../../../core/services/api/assets-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { VisorApiService, VisorStatus } from '../../../../core/services/api/visor-api.service';

export const FaceRendererId = "PROTOGEN_FACE";

@Component({
  selector: 'app-protogen-face-editor',
  templateUrl: './protogen-face-editor.component.html',
  styleUrl: './protogen-face-editor.component.scss',
  standalone: false
})
export class ProtogenFaceEditorComponent implements OnInit, OnDestroy {
  faceExpressions: FaceExpression[] = [];
  assets: BuiltInAsset[] = [];
  faceColorEffectTypes: FaceColorEffectType[] = [];
  faceColorEffects: FaceColorEffect[] = [];
  defaultExpression = "";
  showEdit = false;

  visorStatus: VisorStatus | null = null;
  updateInterval: any = null;

  @ViewChild("newExpressionPrompt") private newExpressionPromptTemplate!: TemplateRef<any>;
  private newExpressionPrompt: NgbModalRef | null = null;
  newExpressionForm = new FormGroup({
    name: new FormControl<string>(""),
    image: new FormControl<string | null>(null),
    mirrorImage: new FormControl<boolean>(false),
    flipRightSide: new FormControl<boolean>(false),
    flipLeftSide: new FormControl<boolean>(false),
    replaceColors: new FormControl<boolean>(false),
    linkedColorEffectId: new FormControl<string | null>(null),
  });

  @ViewChild("newFaceRgbEffectPrompt") private newFaceRgbEffectPromptTemplate!: TemplateRef<any>;
  private newFaceRgbEffectPrompt: NgbModalRef | null = null;
  newFaceRgbEffectForm = new FormGroup({
    name: new FormControl<string>(""),
    type: new FormControl<string>(""),
  });

  lockInputs = false;

  nameInvalid = false;
  nameInUse = false;

  imageMissing = false;

  constructor(
    private faceApi: FaceApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private assetsApi: AssetsApiService,
    private visorApi: VisorApiService,
    private title: Title,
  ) { }

  isDefault(expression: FaceExpression) {
    return expression.data.uuid == this.defaultExpression;
  }

  deactivate() {
    this.faceApi.activateColorEffect(null).pipe(catchError(err => {
      this.toastr.error("Failed to deactivate effect");
      throw err;
    })).subscribe();
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

  get isNotActivated() {
    if (this.visorStatus != null) {
      if (this.visorStatus.activeRenderer?.id != FaceRendererId) {
        return true;
      }
    }
    return false;
  }

  activateSelf() {
    this.visorApi.activateRenderer(FaceRendererId).pipe(catchError(err => {
      this.toastr.error("Failed to activate renderer");
      throw err;
    })).subscribe();
  }

  fetchData() {
    this.updateVisorStatus();

    this.faceApi.getData().pipe(catchError(err => {
      this.toastr.error("Failed to fetch expressions");
      throw err;
    })).subscribe(data => {
      console.log(data);
      this.defaultExpression = data.defaultExpression || "";
      this.faceExpressions = data.expressions;
    });

    this.faceApi.getFaceColorEffects().pipe(catchError(err => {
      this.toastr.error("Failed to fetch color effects");
      throw err;
    })).subscribe(effects => {
      this.faceColorEffects = effects;
    });
  }

  updateVisorStatus() {
    this.visorApi.getStatus().pipe(catchError(err => {
      this.toastr.error("Failed to fetch visor status");
      throw err;
    })).subscribe(status => {
      this.visorStatus = status;
    });
  }

  ngOnDestroy(): void {
    this.newFaceRgbEffectPrompt?.close();
    this.newExpressionPrompt?.close();
    clearInterval(this.updateInterval);
  }

  ngOnInit(): void {
    this.title.setTitle("Face editor - Protogen");

    this.assetsApi.getAssets().pipe(catchError(err => {
      this.toastr.error("Failed to load built-in assets");
      throw err;
    })).subscribe(assets => {
      this.assets = assets;
    });

    this.faceApi.getFaceColorEffectTypes(true).pipe(catchError(err => {
      this.toastr.error("Failed to load available color effects");
      throw err;
    })).subscribe(effects => {
      this.faceColorEffectTypes = effects;
    });

    this.fetchData();

    this.updateInterval = setInterval(() => {
      this.updateVisorStatus();
    }, 2000);
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
      mirrorImage: this.newExpressionForm.get("mirrorImage")?.value || false,
      flipRightSide: this.newExpressionForm.get("flipRightSide")?.value || false,
      flipLeftSide: this.newExpressionForm.get("flipLeftSide")?.value || false,
      replaceColors: this.newExpressionForm.get("replaceColors")?.value || false,
      linkedColorEffectId: this.newExpressionForm.get("linkedColorEffectId")?.value || null,
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

  showNewEffect() {
    this.lockInputs = false;
    this.nameInUse = false;
    this.nameInvalid = false;

    this.newFaceRgbEffectForm.reset();
    if (this.faceColorEffectTypes.length > 0) {
      this.newFaceRgbEffectForm.get("type")?.setValue(this.faceColorEffectTypes[0].name);
    }

    this.newFaceRgbEffectPrompt?.close();
    this.newFaceRgbEffectPrompt = this.modal.open(this.newFaceRgbEffectPromptTemplate);
  }

  visorEffectDelete(effect: FaceColorEffect) {
    this.faceColorEffects = this.faceColorEffects.filter(e => e.id != effect.id);
  }

  addNewEffect() {
    this.nameInvalid = false;
    this.nameInUse = false;

    const name = this.newFaceRgbEffectForm.get("name")?.value || "";

    if (name.trim().length == 0) {
      this.nameInvalid = true;
      this.toastr.error("Please enter a name");
      return;
    }

    const effectType = this.faceColorEffectTypes.find(t => t.name == this.newFaceRgbEffectForm.get("type")?.value);

    if (effectType == null) {
      this.toastr.error("Invalid effect type");
      return;
    }

    this.lockInputs = true;
    this.faceApi.newFaceColorEffect(name, effectType.name).pipe(catchError((err: HttpErrorResponse) => {
      if (err.status === 409) {
        this.nameInUse = true;
        this.toastr.error("Name already in use");
      } else {
        this.toastr.error("Failed to add effect");
      }
      this.lockInputs = false;
      throw err;
    })).subscribe(effect => {
      this.lockInputs = false;
      this.newFaceRgbEffectPrompt?.close();
      this.faceColorEffects.push(effect);
    });
  }
}
