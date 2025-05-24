import { AfterViewInit, Component, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-auth-page',
  standalone: false,
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent implements AfterViewInit, OnDestroy {
  code = "";

  @ViewChild("confirmScannedCodeModal") private confirmScannedCodeModalTemplate!: TemplateRef<any>;
  private confirmScannedCodeModal?: NgbModalRef;
  private confirmScannedCodeModalClosedSubscription?: Subscription;

  constructor(
    private authApi: AuthApiService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private modal: NgbModal,
  ) { }

  approveLogin() {
    if (this.code.trim().length != 8) {
      this.toastr.error("Invalid code");
      return;
    }

    this.confirmScannedCodeModal?.close();

    this.authApi.approveLogin(this.code).pipe(
      catchError(err => {
        this.toastr.error("Failed to approve login");
        throw err;
      })
    ).subscribe(response => {
      if (response == null) {
        this.toastr.error("Invalid or expired code");
      } else {
        this.code = "";
        this.toastr.success("Login approved");
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
