import { Component, Input } from "@angular/core";
import { FaceApiService, FaceColorEffect, FaceColorEffectProperty } from "../../../../../core/services/api/face-api.service";
import { ToastrService } from "ngx-toastr";

@Component({ template: '' })
// eslint-disable-next-line @angular-eslint/component-class-suffix
export abstract class SharedFaceRbgProperty {
  @Input({ required: true }) effect!: FaceColorEffect;
  @Input({ required: true }) property!: FaceColorEffectProperty;
  @Input({ required: true }) inputId!: string;
  @Input({ required: true }) lockInputs = false;

  public getRestriction(key: string) {
    return this.property.restrictions[key];
  }

  public getMetadata(key: string) {
    return this.property.metadata[key];
  }

  constructor(
    protected faceApi: FaceApiService,
    protected toastr: ToastrService,
  ) { }
}
