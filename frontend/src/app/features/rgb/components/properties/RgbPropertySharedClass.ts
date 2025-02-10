import { Component, Input } from "@angular/core";
import { RgbApiService, RgbEffect, RgbEffectProperty, RgbScene } from "../../../../core/services/api/rgb-api.service";
import { ToastrService } from "ngx-toastr";

@Component({
    template: '',
    standalone: false
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export abstract class RgbPropertySharedClass {
  @Input({ required: true }) scene!: RgbScene;
  @Input({ required: true }) effect!: RgbEffect;
  @Input({ required: true }) property!: RgbEffectProperty;
  @Input({ required: true }) inputId!: string;

  public getRestriction(key: string) {
    return this.property.restrictions[key];
  }

  public getMetadata(key: string) {
    return this.property.metadata[key];
  }

  constructor(
    protected api: RgbApiService,
    protected toastr: ToastrService,
  ) { }
}
