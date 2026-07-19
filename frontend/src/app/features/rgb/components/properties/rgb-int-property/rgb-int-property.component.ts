import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RgbPropertySharedClass } from '../RgbPropertySharedClass';
import { undefinedToNull } from '../../../../../core/services/utils/Utils';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-rgb-int-property',
  templateUrl: './rgb-int-property.component.html',
  styleUrl: './rgb-int-property.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
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

  get selectOptions(): { label: string; value: number }[] {
    return this.getMetadata("selectOptions") as { label: string; value: number }[] || [];
  }

  get valueSelect(): string {
    return String(this.property.value);
  }

  onChange(event: Event) {
    const valueString = String((event.target as HTMLInputElement).value);
    this.api.setEffectProperty(this.scene.id, this.effect.id, this.property.name, valueString).pipe(catchError(err => {
      this.toast.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }

  onChangeParse(event: Event) {
    const intVal = parseInt((event.target as HTMLSelectElement).value, 10);
    this.property.value = intVal;
    this.api.setEffectProperty(this.scene.id, this.effect.id, this.property.name, String(intVal)).pipe(catchError(err => {
      this.toast.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}
