import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { App, AppsApi } from '../../../../core/services/api/apps-api.service';
import { catchError } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-apps-page',
  standalone: false,
  templateUrl: './apps-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './apps-page.component.scss'
})
export class AppsPageComponent implements OnInit, OnDestroy {
  private readonly appsApi = inject(AppsApi);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);

  protected apps: App[] = [];
  protected activeApp: App | null = null;
  private interval: any = null;

  ngOnInit(): void {
    this.title.setTitle("Apps - Protogen");
    this.loadApps();
    this.interval = setInterval(() => {
      this.getOpenApp();
    }, 2500);
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }

  private loadApps() {
    this.appsApi.getApps().pipe(catchError(err => {
      this.toast.error("Error loading apps");
      throw err;
    })).subscribe(appList => {
      this.activeApp = appList.activeApp;
      this.apps = appList.apps;
    });
  }

  private getOpenApp() {
    this.appsApi.getActiveApp().pipe(
      catchError(err => {
        console.error('Failed to fetch active app', err);
        return [];
      })
    ).subscribe(activeApp => {
      this.activeApp = activeApp;
    });
  }

  protected appActivated(app: App) {
    this.activeApp = app;
  }

  closeActiveApp() {
    this.appsApi.deactivateApp().pipe(
      catchError(err => {
        this.toast.error("Failed to close app");
        throw err;
      }),
    ).subscribe(result => {
      if (result == true) {
        this.toast.success("App closed");
        this.activeApp = null;
      }
    });
  }
}
