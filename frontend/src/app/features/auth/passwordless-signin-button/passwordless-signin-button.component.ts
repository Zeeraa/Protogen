import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AuthApiService, PasswordlessSigninRequest } from '../../../core/services/api/auth-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ClipboardService } from 'ngx-clipboard';

@Component({
  selector: 'app-passwordless-signin-button',
  standalone: false,
  templateUrl: './passwordless-signin-button.component.html',
  styleUrl: './passwordless-signin-button.component.scss'
})
export class PasswordlessSigninButtonComponent implements OnDestroy, OnInit {
  protected disableButton = false;
  private activeRequest: PasswordlessSigninRequest | null = null;
  private pollRequestStatus = false;
  private checkInterval: any;

  @ViewChild("passwordlessSigninPrompt") private passwordlessSigninPromptTemplate!: TemplateRef<any>;
  private passwordlessSigninPrompt?: NgbModalRef;

  constructor(
    private authApi: AuthApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private auth: AuthService,
    private clipboard: ClipboardService,
  ) { }

  get authUrl() {
    return window.location.origin + "/auth";
  }

  get signinKey() {
    return this.activeRequest?.signinKey || "";
  }

  ngOnDestroy(): void {
    this.passwordlessSigninPrompt?.close();
    clearInterval(this.checkInterval);
  }

  copyCode() {
    if (this.activeRequest != null) {
      this.clipboard.copy(this.activeRequest.signinKey);
      this.toastr.success("Code copied to clipboard");
    }
  }

  ngOnInit(): void {
    this.checkInterval = setInterval(() => {
      if (this.activeRequest != null && this.pollRequestStatus) {
        this.authApi.checkSigninRequestStatus(this.activeRequest).pipe(
          catchError((err: HttpErrorResponse) => {
            if (err.status == 404) {
              this.toastr.error("Request expired or not found");
              this.activeRequest = null;
              this.passwordlessSigninPrompt?.close();
            }
            throw err;
          })
        ).subscribe(request => {
          if (request.used) {
            this.toastr.error("Request already used");
            this.activeRequest = null;
            this.passwordlessSigninPrompt?.close();
          }

          if (request.approvedBy != null) {
            this.toastr.success("Request approved. Logging in...");
            this.pollRequestStatus = false;
            this.authApi.aquireTokenFromPasswordless(request).pipe(
              catchError(err => {
                this.toastr.error("Failed to aquire token");
                this.passwordlessSigninPrompt?.close();
                throw err;
              })
            ).subscribe(token => {
              this.auth.setToken(token.token);
              this.activeRequest = null;
              this.passwordlessSigninPrompt?.close();
            });
          }
        });
      }
    }, 1000);
  }

  beginPasswordlessSignIn() {
    this.disableButton = true;
    this.authApi.beginPasswordlessSignIn().pipe(
      catchError(err => {
        this.disableButton = false;
        this.toastr.error("Failed to begin passwordless sign in");
        throw err;
      })
    ).subscribe(request => {
      this.disableButton = false;
      this.pollRequestStatus = true;
      this.activeRequest = request;
      this.passwordlessSigninPrompt = this.modal.open(this.passwordlessSigninPromptTemplate, {
        backdrop: "static",
        keyboard: false,
      });
    });
  }

  cancelRequest() {
    this.activeRequest = null;
    this.passwordlessSigninPrompt?.close();
  }
}
