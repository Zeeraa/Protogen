import { Component, OnDestroy, OnInit } from '@angular/core';
import { VisorApiService, VisorRenderer, VisorStatus } from '../../../../core/services/api/visor-api.service';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-visor-page',
  templateUrl: './visor-page.component.html',
  styleUrl: './visor-page.component.scss'
})
export class VisorPageComponent implements OnInit, OnDestroy {
  status: VisorStatus | null = null;
  renderers: VisorRenderer[] = [];
  updateInterval: any = null;
  updatePreviewInterval: any = null;
  previewImage = "/visor_blank.png";

  get hasRenderLock() {
    return this.status?.hasRenderLock === true;
  }

  get renderLocks() {
    return this.status?.renderLocks || [];
  }

  get rendererName() {
    return this.status?.activeRenderer?.name || "";
  }

  update() {
    this.api.getStatus().subscribe(status => {
      this.status = status;
    })
  }

  fetchRenderers() {
    this.api.getRenderers().pipe(catchError(err => {
      this.toastr.error("Failed to fetch renderers");
      throw err;
    })).subscribe(renderers => {
      this.renderers = renderers;
    });
  }

  async updatePreview() {
    try {
      this.previewImage = await this.api.getPreviewBase64();
    } catch (err) {
      console.log(err);
      this.toastr.error("Failed to fetch visor preview");
    }
  }

  constructor(
    private api: VisorApiService,
    private toastr: ToastrService,
  ) { }

  ngOnInit(): void {
    this.update();
    this.fetchRenderers();
    this.updatePreview();

    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);

    this.updatePreviewInterval = setInterval(() => {
      this.updatePreview();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }

    if (this.updatePreviewInterval != null) {
      clearInterval(this.updatePreviewInterval);
    }
  }
}
