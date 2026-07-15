import { AfterViewInit, Component, inject, OnDestroy, TemplateRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { catchError, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-auth-page',
  standalone: false,
  templateUrl: './auth-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent implements AfterViewInit, OnDestroy {
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modal = inject(NgbModal);

  code = "";

  @ViewChild("confirmScannedCodeModal") private confirmScannedCodeModalTemplate!: TemplateRef<any>;
  private confirmScannedCodeModal?: NgbModalRef;
  private confirmScannedCodeModalClosedSubscription?: Subscription;

  approveLogin() {
    if (this.code.trim().length != 8) {
      this.toast.error("Invalid code");
      return;
    }

    this.confirmScannedCodeModal?.close();

    this.authApi.approveLogin(this.code).pipe(
      catchError(err => {
        this.toast.error("Failed to approve login");
        throw err;
      })
    ).subscribe(response => {
      if (response == null) {
        this.toast.error("Invalid or expired code");
      } else {
        this.code = "";
        this.toast.success("Login approved");
      }
    })
  }

  ngAfterViewInit(): void {
    const signinKey = this.route.snapshot.queryParams['signinKey'];
    if (signinKey != null) {
      this.code = signinKey;

      this.confirmScannedCodeModal = this.modal.open(this.confirmScannedCodeModalTemplate, {
        backdrop: 'static',
        keyboard: false,
      });

      this.confirmScannedCodeModalClosedSubscription = this.confirmScannedCodeModal.closed.subscribe(() => {
        // Alter the url to not include the code anymore
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { signinKey: null },
          queryParamsHandling: 'merge',
        }).then(() => {
          this.code = "";
        });

      });
    }
  }

  ngOnDestroy(): void {
    this.confirmScannedCodeModalClosedSubscription?.unsubscribe();
  }
}
