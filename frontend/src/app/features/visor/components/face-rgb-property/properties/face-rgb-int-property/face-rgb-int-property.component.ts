import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SharedFaceRbgProperty } from '../SharedFaceRbgProperty';
import { undefinedToNull } from '../../../../../../core/services/utils/Utils';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-face-rgb-int-property',
  templateUrl: './face-rgb-int-property.component.html',
  styleUrl: './face-rgb-int-property.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class FaceRgbIntPropertyComponent extends SharedFaceRbgProperty {
  get type(): string {
    return this.getMetadata("intInputType") as string || "DEFAULT";
  }

  get min() {
    return undefinedToNull(this.getRestriction("min") as number);
  }

  get max() {
    return undefinedToNull(this.getRestriction("max") as number);
  }

  onChange(event: Event) {
    const valueString = String((event.target as HTMLInputElement).value);
    this.faceApi.setEffectProperty(this.effect.id, this.property.name, valueString).pipe(catchError(err => {
      this.toast.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}
