import { Component } from '@angular/core';
import { RgbPropertySharedClass } from '../RgbPropertySharedClass';
import { undefinedToNull } from '../../../../../core/services/utils/Utils';
import { catchError } from 'rxjs';

@Component({
    selector: 'app-rgb-int-property',
    templateUrl: './rgb-int-property.component.html',
    styleUrl: './rgb-int-property.component.scss',
    standalone: false
})
export class RgbIntPropertyComponent extends RgbPropertySharedClass {
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
    this.api.setEffectProperty(this.scene.id, this.effect.id, this.property.name, valueString).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}
