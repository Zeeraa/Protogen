import { Directive, inject, Input } from "@angular/core";
import { RgbApiService, RgbEffect, RgbEffectProperty, RgbScene } from "../../../../core/services/api/rgb-api.service";
import { ToastService } from "ngx-yet-another-toast-library";

@Directive({
  standalone: false
})
export abstract class RgbPropertySharedClass {
  protected readonly api = inject(RgbApiService);
  protected readonly toast = inject(ToastService);

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

  public get hasDescription() {
    return this.property.description != null;
  }

  public get description() {
    return this.property.description || undefined;
  }
}
