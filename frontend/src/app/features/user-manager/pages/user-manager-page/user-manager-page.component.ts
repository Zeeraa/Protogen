import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthApiService, ProtogenUser } from '../../../../core/services/api/auth-api.service';
import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-user-manager-page',
  templateUrl: './user-manager-page.component.html',
  styleUrl: './user-manager-page.component.scss'
})
export class UserManagerPageComponent implements OnInit, OnDestroy {
  users: ProtogenUser[] = [];
  deleteUserName = "MissingNo";
  deleteUserId = -1;

  private deleteUserPrompt: NgbModalRef | null = null;
  @ViewChild("deleteUserPrompt") private deleteUserPromptTemplate!: TemplateRef<any>;

  private newUserPrompt: NgbModalRef | null = null;
  @ViewChild("newUserPrompt") private newUserPromptTemplate!: TemplateRef<any>;
  newUserForm = new FormGroup({
    username: new FormControl<string>(""),
    password: new FormControl<string>(""),
    confirmPassword: new FormControl<string>(""),
    admin: new FormControl<boolean>(false),
  });
  usernameTaken = false;
  usernameEmpty = false;
  passwordEmpty = false;
  passwordsNotMatching = false;
  lockInputs = false;

  private changePasswordPrompt: NgbModalRef | null = null;
  @ViewChild("changePasswordPrompt") private changePasswordPromptTemplate!: TemplateRef<any>;
  changePasswordForm = new FormGroup({
    oldPassword: new FormControl<string>(""),
    newPassword: new FormControl<string>(""),
    confirmNewPassword: new FormControl<string>(""),
  });
  passwordChangeUserId = -1;
  passwordChangeUserName = "MissingNo";
  oldPasswordMissing = false;
  oldPasswordWrong = false;

  constructor(
    private auth: AuthService,
    private authApi: AuthApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
  ) { }

  loadUserList() {
    this.authApi.getUsers().pipe(catchError(err => {
      this.toastr.error("Failed to fetch users");
      throw err;
    })).subscribe(users => {
      this.users = users;
    })
  }

  get isChangingOwnPassword() {
    return this.passwordChangeUserId == (this.auth.authDetails?.userId || -420);
  }

  showPasswordChange(user: ProtogenUser) {
    this.passwordChangeUserName = user.username;
    this.passwordChangeUserId = user.id;

    this.oldPasswordMissing = false;
    this.oldPasswordWrong = false;
    this.passwordEmpty = false;
    this.passwordsNotMatching = false;
    this.lockInputs = false;

    this.changePasswordForm.get("oldPassword")?.setValue("");
    this.changePasswordForm.get("newPassword")?.setValue("");
    this.changePasswordForm.get("confirmNewPassword")?.setValue("");

    this.changePasswordPrompt = this.modal.open(this.changePasswordPromptTemplate);
  }

  confirmChangePassword() {
    this.oldPasswordWrong = false;
    this.oldPasswordMissing = false;
    this.passwordEmpty = false;
    this.passwordsNotMatching = false;
    this.lockInputs = false;

    let didWarn = false;

    let oldPassword = "";
    if (this.isChangingOwnPassword) {
      oldPassword = this.changePasswordForm.get("oldPassword")?.value || "";

      if (oldPassword.trim().length == 0) {
        didWarn = true;
        this.toastr.error("Old password needed to change your password");
        this.oldPasswordMissing = true;
      }
    }

    const password = this.changePasswordForm.get("newPassword")?.value || "";
    if (password.trim().length == 0) {
      if (!didWarn) {
        this.toastr.error("Password can not be empty");
        didWarn = true;
      }
      this.passwordEmpty = true;
    }

    if (didWarn) {
      return;
    }

    const confirmPassword = this.changePasswordForm.get("confirmNewPassword")?.value || "";
    if (password != confirmPassword) {
      this.toastr.error("Passwords not matching");
      this.passwordsNotMatching = true;
      return;
    }

    this.authApi.changePassword(this.passwordChangeUserId, { oldPassword, password }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;

        if (err.status == 403) {
          this.toastr.error("Old password incorrect");
          this.oldPasswordWrong = true;
          return of(null);
        }

        this.toastr.error("Failed to change password");
        throw err;
      })
    ).subscribe(user => {
      if (user == null) {
        return;
      }
      if (this.isChangingOwnPassword) {
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
      this.toastr.success("Password changed");
      this.changePasswordPrompt?.close();
    })
  }

  showDeletePrompt(user: ProtogenUser) {
    this.deleteUserId = user.id;
    this.deleteUserName = user.username;
    this.deleteUserPrompt?.close();
    this.deleteUserPrompt = this.modal.open(this.deleteUserPromptTemplate);
  }

  showNewUserPrompt() {
    this.usernameEmpty = false;
    this.usernameTaken = false;
    this.passwordsNotMatching = false;
    this.passwordEmpty = false;
    this.lockInputs = false;

    this.newUserForm.get("username")?.setValue("");
    this.newUserForm.get("password")?.setValue("");
    this.newUserForm.get("confirmPassword")?.setValue("");
    this.newUserForm.get("admin")?.setValue(false);

    this.newUserPrompt = this.modal.open(this.newUserPromptTemplate);
  }

  confirmCreateUser() {
    this.usernameEmpty = false;
    this.usernameTaken = false;
    this.passwordEmpty = false;
    this.passwordsNotMatching = false;
    let didWarn = false;

    const username = this.newUserForm.get("username")?.value || "";
    if (username.trim().length == 0) {
      didWarn = true;
      this.toastr.error("Username can not be empty");
      this.usernameEmpty = true;
    }

    const password = this.newUserForm.get("password")?.value || "";
    if (password.trim().length == 0) {
      if (!didWarn) {
        this.toastr.error("Password can not be empty");
        didWarn = true;
      }
      this.passwordEmpty = true;
    }

    if (didWarn) {
      return;
    }

    const confirmPassword = this.newUserForm.get("confirmPassword")?.value || "";
    if (password != confirmPassword) {
      this.toastr.error("Passwords not matching");
      this.passwordsNotMatching = true;
      return;
    }

    const superUser = this.newUserForm.get("admin")?.value == true;

    this.lockInputs = true;
    this.authApi.createUser({ username, password, superUser }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;

        if (err.status == 409) {
          this.toastr.error("Username already taken");
          this.usernameTaken = true;
          return of(null);
        }

        this.toastr.error("Failed to create user");
        throw err;
      })
    ).subscribe(user => {
      this.lockInputs = false;

      if (user == null) {
        return;
      }
      this.users.push(user);
      this.newUserPrompt?.close();
      this.loadUserList();
    });
  }

  confirmDeleteUser() {
    this.authApi.deleteUser(this.userId).subscribe(() => {
      this.users = this.users.filter(u => u.id != this.deleteUserId);
      this.toastr.success("User deleted");
    });
    this.deleteUserPrompt?.close();
  }

  ngOnInit(): void {
    this.loadUserList();
  }

  ngOnDestroy(): void {
    this.deleteUserPrompt?.close();
    this.newUserPrompt?.close();
    this.changePasswordPrompt?.close();
  }

  get isAdmin() {
    return this.auth.authDetails?.isSuperUser || false;
  }

  get userId() {
    return this.auth.authDetails?.userId || -1;
  }
}
