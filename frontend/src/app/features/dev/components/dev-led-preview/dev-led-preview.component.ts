import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dev-led-preview',
  standalone: false,
  templateUrl: './dev-led-preview.component.html',
  styleUrl: './dev-led-preview.component.scss'
})
export class DevLedPreviewComponent {
  @Input({ required: true }) index!: number;
  @Input({ required: true }) color!: number;

  get colorAsHex(): string {
    return `#${this.color.toString(16).padStart(6, '0')}`;
  }
}
