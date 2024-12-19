import { Component, Input } from '@angular/core';
import { VisorApiService, VisorRenderer, VisorRendererType } from '../../../../core/services/api/visor-api.service';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-renderer-card',
  templateUrl: './renderer-card.component.html',
  styleUrl: './renderer-card.component.scss'
})
export class RendererCardComponent {
  @Input({ required: true }) renderer!: VisorRenderer;

  activate() {
    this.api.activateRenderer(this.renderer.id).pipe(catchError(err => {
      this.toastr.error("Failed to activate");
      throw err;
    })).subscribe();
  }

  get hasPreview() {
    return this.renderer.preview != null;
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

  constructor(
    private toastr: ToastrService,
    private api: VisorApiService,
  ) { }
}
