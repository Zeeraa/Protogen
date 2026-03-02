import { Directive, inject, Input } from "@angular/core";
import { FaceApiService, FaceColorEffect, FaceColorEffectProperty } from "../../../../../core/services/api/face-api.service";
import { ToastrService } from "ngx-toastr";

@Directive({
  standalone: false
})
export abstract class SharedFaceRbgProperty {
  protected readonly faceApi = inject(FaceApiService);
  protected readonly toastr = inject(ToastrService);

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

  public get hasDescription() {
    return this.property.description != null;
  }

  public get description() {
    return this.property.description || undefined;
  }
}
