import { Component, Input } from '@angular/core';
import { FaceColorEffect, FaceColorEffectProperty } from '../../../../core/services/api/face-api.service';

@Component({
    selector: 'app-face-rgb-property',
    templateUrl: './face-rgb-property.component.html',
    styleUrl: './face-rgb-property.component.scss',
    standalone: false
})
export class FaceRgbPropertyComponent {
  @Input({ required: true }) effect!: FaceColorEffect;
  @Input({ required: true }) property!: FaceColorEffectProperty;
  @Input() readOnly = false;

  get id() {
    return "fProp_" + this.effect.id + "_" + this.property.name;
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
