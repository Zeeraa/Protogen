import { Component, input, output } from '@angular/core';
import { FaceExpression, FaceColorEffect } from '../../../../core/services/api/face-api.service';
import { VisorRenderer, VisorRendererType } from '../../../../core/services/api/visor-api.service';

@Component({
  selector: 'app-dashboard-face-card',
  standalone: false,
  templateUrl: './dashboard-face-card.component.html',
  styleUrl: './dashboard-face-card.component.scss'
})
export class DashboardFaceCardComponent {
  readonly renderers = input.required<VisorRenderer[]>();
  readonly expressions = input.required<FaceExpression[]>();
  readonly faceRgbEffects = input.required<FaceColorEffect[]>();
  readonly activeRendererId = input<string | null>(null);
  readonly activeExpressionId = input<string | null>(null);
  readonly activeFaceRgbId = input<string | null>(null);
  readonly activateRenderer = output<VisorRenderer>();
  readonly activateExpression = output<FaceExpression>();
  readonly activateFaceRgb = output<FaceColorEffect>();
  readonly disableFaceRgb = output<void>();

  protected getRendererPreview(renderer: VisorRenderer): string | null {
    if (renderer.type === VisorRendererType.Face) {
      return '/protogen_face.png';
    }
    if (renderer.preview?.startsWith('data:image/png')) {
      return renderer.preview;
    }
    return null;
  }
}
