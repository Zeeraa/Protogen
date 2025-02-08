import { Component, Input } from '@angular/core';
import { FaceExpression } from '../../../../core/services/api/face-api.service';

@Component({
  selector: 'app-protogen-expression-card',
  templateUrl: './protogen-expression-card.component.html',
  styleUrl: './protogen-expression-card.component.scss'
})
export class ProtogenExpressionCardComponent {
  @Input({ required: true }) expression!: FaceExpression;
  @Input() isDefault = false;

  get previewB64() {
    return this.expression.preview;
  }

  activate() {
    console.log("not implemented");
  }

  edit() {
    console.log("not implemented");
  }
}
