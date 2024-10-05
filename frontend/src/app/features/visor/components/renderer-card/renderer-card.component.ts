import { Component, Input } from '@angular/core';
import { VisorApiService, VisorRenderer } from '../../../../core/services/api/visor-api.service';
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

  constructor(
    private toastr: ToastrService,
    private api: VisorApiService,
  ) { }
}
