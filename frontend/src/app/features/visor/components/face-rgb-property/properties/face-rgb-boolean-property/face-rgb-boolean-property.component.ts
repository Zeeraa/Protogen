import { Component } from '@angular/core';
import { SharedFaceRbgProperty } from '../SharedFaceRbgProperty';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-face-rgb-boolean-property',
  templateUrl: './face-rgb-boolean-property.component.html',
  styleUrl: './face-rgb-boolean-property.component.scss'
})
export class FaceRgbBooleanPropertyComponent extends SharedFaceRbgProperty {
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
    this.faceApi.setEffectProperty(this.effect.id, this.property.name, String(checked)).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }

  onChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.faceApi.setEffectProperty(this.effect.id, this.property.name, String(checked)).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}
