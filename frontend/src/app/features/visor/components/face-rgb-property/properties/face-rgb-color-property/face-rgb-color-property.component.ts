import { Component, OnInit } from '@angular/core';
import { SharedFaceRbgProperty } from '../SharedFaceRbgProperty';
import { hexColorToNumber, numberToHexColor } from '../../../../../../core/services/utils/Utils';
import { catchError } from 'rxjs';

@Component({
    selector: 'app-face-rgb-color-property',
    templateUrl: './face-rgb-color-property.component.html',
    styleUrl: './face-rgb-color-property.component.scss',
    standalone: false
})
export class FaceRgbColorPropertyComponent extends SharedFaceRbgProperty implements OnInit {
  hexColor = "#000000";

  loadValue() {
    this.hexColor = numberToHexColor(this.property.value);
    console.debug("ColorProp: Load value as " + this.hexColor);
  }

  ngOnInit(): void {
    this.loadValue();
  }

  onChange(event: Event) {
    this.hexColor = String((event.target as HTMLInputElement).value);
    console.debug("Color changed to " + this.hexColor);
    const color = hexColorToNumber(this.hexColor);
    this.faceApi.setEffectProperty(this.effect.id, this.property.name, String(color)).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}
