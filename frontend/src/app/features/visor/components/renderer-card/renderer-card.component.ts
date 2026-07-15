import { Component, inject, Input, ChangeDetectionStrategy } from '@angular/core';
import { VisorApiService, VisorRenderer, VisorRendererType } from '../../../../core/services/api/visor-api.service';
import { catchError } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-renderer-card',
  templateUrl: './renderer-card.component.html',
  styleUrl: './renderer-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class RendererCardComponent {
  private readonly toast = inject(ToastService);
  private readonly api = inject(VisorApiService);

  @Input({ required: true }) renderer!: VisorRenderer;

  activate() {
    this.api.activateRenderer(this.renderer.id).pipe(catchError(err => {
      this.toast.error("Failed to activate");
      throw err;
    })).subscribe();
  }

  get hasPreview() {
    return this.renderer.preview != null;
  }

  get isFace() {
    return this.renderer.type == VisorRendererType.Face;
  }

  get previewSrc() {
    if (this.renderer.preview != null) {
      if (this.renderer.preview.startsWith("data:image/png")) {
        return this.renderer.preview;
      }
    }
    return "";
  }

  get isCustomisableImageType() {
    return this.renderer.type == VisorRendererType.CustomisableImage;
  }

}
