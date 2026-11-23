import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, output, signal, TemplateRef, viewChild } from '@angular/core';
import { App, AppsApi } from '../../../../core/services/api/apps-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { toDataURL } from 'qrcode';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-app-card', // Peak naming scheme :3
  standalone: false,
  templateUrl: './app-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app-card.component.scss'
})
export class AppCardComponent implements OnDestroy {
  private readonly appApi = inject(AppsApi);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(NgbModal);

  public readonly app = input.required<App>();
  public readonly isActive = input(false);
  public readonly activated = output<App>();

  private readonly appInviteModalTemplate = viewChild.required<TemplateRef<unknown>>("appInviteModal");
  private appInviteModal?: NgbModalRef;

  protected readonly qrCode = signal("data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=");
  protected readonly appLink = signal("");
  protected readonly hasWebUiPage = computed(() => this.app().options.webPath != null);

  public startApp(params = {}) {
    this.appApi.activateApp(this.app().name, params).pipe(
      catchError(err => {
        this.toast.error("Failed to start app");
        throw err;
      })
    ).subscribe(() => {
      this.toast.success("App started");
      this.activated.emit(this.app());
    });
  }

  public createInvite() {
    this.appApi.getAppToken(this.app().name).pipe(
      catchError(err => {
        this.toast.error("Failed to create invite token");
        throw err;
      })
    ).subscribe((token) => {
      const fullUrl = window.location.origin + this.app().options.webPath + "?token=" + token.token;

      this.appInviteModal?.close();
      this.appLink.set(fullUrl);

      toDataURL(fullUrl, { errorCorrectionLevel: 'L' }, (err, url) => {
        if (err) {
          console.error(err);
          this.toast.error("Failed to generate QR code");
          return;
        }
        this.qrCode.set(url);
        this.appInviteModal?.close();
        this.appInviteModal = this.modal.open(this.appInviteModalTemplate());
      });
    });
  }

  ngOnDestroy(): void {
    this.appInviteModal?.close();
  }
}
