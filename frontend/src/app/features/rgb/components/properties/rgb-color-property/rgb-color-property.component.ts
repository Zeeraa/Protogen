import { Component, OnInit } from '@angular/core';
import { RgbPropertySharedClass } from '../RgbPropertySharedClass';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-rgb-color-property',
  templateUrl: './rgb-color-property.component.html',
  styleUrl: './rgb-color-property.component.scss'
})
export class RgbColorPropertyComponent extends RgbPropertySharedClass implements OnInit {
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
    this.api.setEffectProperty(this.scene.id, this.effect.id, this.property.name, String(color)).pipe(catchError(err => {
      this.toastr.error("Failed to update property");
      throw err;
    })).subscribe(() => {
      console.debug("Property updated");
    });
  }
}

function numberToHexColor(num: number): string {
  num = Math.max(0, Math.min(0xFFFFFF, num));
  let hex = num.toString(16).toUpperCase();
  return "#" + hex.padStart(6, "0");
}

function hexColorToNumber(hex: string): number {
  hex = hex.replace("#", "");
  return parseInt(hex, 16);
}
