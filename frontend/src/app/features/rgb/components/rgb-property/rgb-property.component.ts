import { Component, Input } from '@angular/core';
import { RgbEffect, RgbEffectProperty, RgbScene } from '../../../../core/services/api/rgb-api.service';

@Component({
  selector: 'app-rgb-property',
  templateUrl: './rgb-property.component.html',
  styleUrl: './rgb-property.component.scss'
})
export class RgbPropertyComponent {
  @Input({ required: true }) scene!: RgbScene;
  @Input({ required: true }) effect!: RgbEffect;
  @Input({ required: true }) property!: RgbEffectProperty;

  get id() {
    return "prop_" + this.effect.id + "_" + this.property.name;
  }

  get propertyType() {
    return this.property.type;
  }

  get value(): any {
    return this.property.value;
  }

  get name() {
    return this.property.name;
  }
}
