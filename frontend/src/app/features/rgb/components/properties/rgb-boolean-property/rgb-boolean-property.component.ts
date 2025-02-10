import { Component } from '@angular/core';
import { RgbPropertySharedClass } from '../RgbPropertySharedClass';
import { catchError } from 'rxjs';

@Component({
    selector: 'app-rgb-boolean-property',
    templateUrl: './rgb-boolean-property.component.html',
    styleUrl: './rgb-boolean-property.component.scss',
    standalone: false
})
export class RgbBooleanPropertyComponent extends RgbPropertySharedClass {
  get type(): string {
    return this.getMetadata("boolInputType") as string || "SWITCH";
  }

  get selectTrueText(): string {
    return this.getMetadata("selectTrueText") as string || "True";
  }

  get selectFalseText(): string {
    return this.getMetadata("selectFalseText") as string || "False";
  }

  get valueSelect() {
    return String(this.property.value);
  }

  onChangeParse(event: Event) {
    const checked = String((event.target as HTMLInputElement).value) == "true";
    this.property.value = checked;
    this.api.setEffectProperty(this.scene.id, this.effect.id, this.property.name, String(checked)).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }

  onChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.api.setEffectProperty(this.scene.id, this.effect.id, this.property.name, String(checked)).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}
