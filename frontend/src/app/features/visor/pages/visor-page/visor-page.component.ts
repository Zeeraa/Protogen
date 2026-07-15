import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { VisorApiService, VisorRenderer, VisorStatus } from '../../../../core/services/api/visor-api.service';
import { catchError } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-visor-page',
  templateUrl: './visor-page.component.html',
  styleUrl: './visor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class VisorPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(VisorApiService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);
  private readonly router = inject(Router);

  status: VisorStatus | null = null;
  renderers: VisorRenderer[] = [];
  updateInterval: any = null;

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
    this.api.getStatus().pipe(catchError(err => {
      console.error('Failed to fetch visor status', err);
      return [];
    })).subscribe(status => {
      this.status = status;
    });
  }

  fetchRenderers() {
    this.api.getRenderers().pipe(catchError(err => {
      this.toast.error("Failed to fetch renderers");
      throw err;
    })).subscribe(renderers => {
      this.renderers = renderers;
    });
  }

  createNewImageRenderer() {
    this.api.createBlankImageRenderer().pipe(catchError(err => {
      this.toast.error("Failed to create renderer");
      throw err;
    })).subscribe(result => {
      this.router.navigate(["/visor/image/" + result.id]);
    })
  }

  ngOnInit(): void {
    this.update();
    this.fetchRenderers();

    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);

    this.title.setTitle("Visor - Protogen");
  }

  ngOnDestroy(): void {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }
  }
}
