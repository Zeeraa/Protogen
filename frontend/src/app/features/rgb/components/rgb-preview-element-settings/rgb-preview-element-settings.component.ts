import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RgbPreviewElement, RgbPreviewElementType } from '../../../../core/services/api/rgb-api.service';

@Component({
  selector: 'app-rgb-preview-element-settings',
  templateUrl: './rgb-preview-element-settings.component.html',
  styleUrl: './rgb-preview-element-settings.component.scss'
})
export class RgbPreviewElementSettingsComponent {
  @Input({ required: true }) element!: RgbPreviewElement;
  @Output() changed = new EventEmitter<void>();

  get elementId() {
    return this.element.id;
  }

  get types() {
    return Object.values(RgbPreviewElementType);
  }

  handleChange() {
    this.changed.emit();
  }
}
