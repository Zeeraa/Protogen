import { Component, OnDestroy, OnInit } from '@angular/core';
import { VisorApiService, VisorRenderer, VisorStatus } from '../../../../core/services/api/visor-api.service';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
    selector: 'app-visor-page',
    templateUrl: './visor-page.component.html',
    styleUrl: './visor-page.component.scss',
    standalone: false
})
export class VisorPageComponent implements OnInit, OnDestroy {
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

  createNewImageRenderer() {
    this.api.createBlankImageRenderer().pipe(catchError(err => {
      this.toastr.error("Failed to create renderer");
      throw err;
    })).subscribe(result => {
      this.router.navigate(["/visor/image/" + result.id]);
    })
  }

  constructor(
    private api: VisorApiService,
    private toastr: ToastrService,
    private title: Title,
    private router: Router,
  ) { }

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
