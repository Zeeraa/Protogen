import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { App, AppsApi } from '../../../../core/services/api/apps-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-app-card', // Peak naming scheme :3
  standalone: false,
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.scss'
})
export class AppCardComponent implements OnDestroy {
  @Input({ required: true }) app!: App;
  @Input() isActive = false;
  @Output() activated = new EventEmitter<App>();

  @ViewChild("appInviteModal") appInviteModalTemplate!: TemplateRef<any>;
  private appInviteModal?: NgbModalRef;

  protected qrCode = "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";
  protected appLink = "";

  constructor(
    private appApi: AppsApi,
    private toastr: ToastrService,
    private modal: NgbModal,
  ) { }

  public startApp() {
    this.appApi.activateApp(this.app.name).pipe(
      catchError(err => {
        this.toastr.error("Failed to start app");
        throw err;
      })
    ).subscribe(() => {
      this.toastr.success("App started");
      this.activated.emit(this.app);
    });
  }

  public createInvite() {
    this.appApi.getAppToken(this.app.name).pipe(
      catchError(err => {
        this.toastr.error("Failed to create invite token");
        throw err;
      })
    ).subscribe((token) => {
      const fullUrl = window.location.origin + this.app.options.webPath + "?token=" + token.token;

      this.appInviteModal?.close();
      this.appLink = fullUrl;

      toDataURL(fullUrl, { errorCorrectionLevel: 'L' }, (err, url) => {
        if (err) {
          console.error(err);
          this.toastr.error("Failed to generate QR code");
          return;
        }
        this.qrCode = url;
        this.appInviteModal?.close();
        this.appInviteModal = this.modal.open(this.appInviteModalTemplate);
      });
    });
  }

  get hasWebUiPage() {
    return this.app.options.webPath != null;
  }

  ngOnDestroy(): void {
    this.appInviteModal?.close();
  }
}
