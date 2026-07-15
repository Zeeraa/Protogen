import { Component, computed, DestroyRef, inject, signal, TemplateRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthApiService, ProtogenUser } from '../../../../core/services/api/auth-api.service';
import { catchError, of } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-user-manager-page',
  templateUrl: './user-manager-page.component.html',
  styleUrl: './user-manager-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class UserManagerPageComponent {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(NgbModal);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = signal<ProtogenUser[]>([]);
  protected readonly deleteUserName = signal("MissingNo");
  protected readonly deleteUserId = signal(-1);

  private deleteUserPrompt: NgbModalRef | null = null;
  private readonly deleteUserPromptTemplate = viewChild.required<TemplateRef<unknown>>("deleteUserPrompt");

  private newUserPrompt: NgbModalRef | null = null;
  private readonly newUserPromptTemplate = viewChild.required<TemplateRef<unknown>>("newUserPrompt");
  protected readonly newUserForm = new FormGroup({
    username: new FormControl<string>(""),
    password: new FormControl<string>(""),
    confirmPassword: new FormControl<string>(""),
    admin: new FormControl<boolean>(false),
  });
  protected readonly usernameTaken = signal(false);
  protected readonly usernameEmpty = signal(false);
  protected readonly passwordEmpty = signal(false);
  protected readonly passwordsNotMatching = signal(false);
  protected readonly lockInputs = signal(false);

  private changePasswordPrompt: NgbModalRef | null = null;
  private readonly changePasswordPromptTemplate = viewChild.required<TemplateRef<unknown>>("changePasswordPrompt");
  protected readonly changePasswordForm = new FormGroup({
    oldPassword: new FormControl<string>(""),
    newPassword: new FormControl<string>(""),
    confirmNewPassword: new FormControl<string>(""),
  });
  protected readonly passwordChangeUserId = signal(-1);
  protected readonly passwordChangeUserName = signal("MissingNo");
  protected readonly oldPasswordMissing = signal(false);
  protected readonly oldPasswordWrong = signal(false);

  protected readonly isChangingOwnPassword = computed(() =>
    this.passwordChangeUserId() == (this.auth.authDetails?.userId ?? -420)
  );

  protected readonly isAdmin = computed(() => this.auth.authDetails?.isSuperUser ?? false);
  protected readonly userId = computed(() => this.auth.authDetails?.userId ?? -1);

  constructor() {
    this.title.setTitle("User manager - Protogen");

    this.destroyRef.onDestroy(() => {
      this.deleteUserPrompt?.close();
      this.newUserPrompt?.close();
      this.changePasswordPrompt?.close();
    });

    this.loadUserList();
  }

  protected loadUserList() {
    this.authApi.getUsers().pipe(catchError(err => {
      this.toast.error("Failed to fetch users");
      throw err;
    })).subscribe(users => {
      this.users.set(users);
    });
  }

  protected showPasswordChange(user: ProtogenUser) {
    this.passwordChangeUserName.set(user.username);
    this.passwordChangeUserId.set(user.id);

    this.oldPasswordMissing.set(false);
    this.oldPasswordWrong.set(false);
    this.passwordEmpty.set(false);
    this.passwordsNotMatching.set(false);
    this.lockInputs.set(false);

    this.changePasswordForm.get("oldPassword")?.setValue("");
    this.changePasswordForm.get("newPassword")?.setValue("");
    this.changePasswordForm.get("confirmNewPassword")?.setValue("");

    this.changePasswordPrompt = this.modal.open(this.changePasswordPromptTemplate());
  }

  protected confirmChangePassword() {
    this.oldPasswordWrong.set(false);
    this.oldPasswordMissing.set(false);
    this.passwordEmpty.set(false);
    this.passwordsNotMatching.set(false);
    this.lockInputs.set(false);

    let didWarn = false;

    let oldPassword = "";
    if (this.isChangingOwnPassword()) {
      oldPassword = this.changePasswordForm.get("oldPassword")?.value || "";

      if (oldPassword.trim().length == 0) {
        didWarn = true;
        this.toast.error("Old password needed to change your password");
        this.oldPasswordMissing.set(true);
      }
    }

    const password = this.changePasswordForm.get("newPassword")?.value || "";
    if (password.trim().length == 0) {
      if (!didWarn) {
        this.toast.error("Password can not be empty");
        didWarn = true;
      }
      this.passwordEmpty.set(true);
    }

    if (didWarn) {
      return;
    }

    const confirmPassword = this.changePasswordForm.get("confirmNewPassword")?.value || "";
    if (password != confirmPassword) {
      this.toast.error("Passwords not matching");
      this.passwordsNotMatching.set(true);
      return;
    }

    this.authApi.changePassword(this.passwordChangeUserId(), { oldPassword, password }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs.set(false);

        if (err.status == 403) {
          this.toast.error("Old password incorrect");
          this.oldPasswordWrong.set(true);
          return of(null);
        }

        this.toast.error("Failed to change password");
        throw err;
      })
    ).subscribe(user => {
      if (user == null) {
        return;
      }
      if (this.isChangingOwnPassword()) {
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
      this.toast.success("Password changed");
      this.changePasswordPrompt?.close();
    });
  }

  protected showDeletePrompt(user: ProtogenUser) {
    this.deleteUserId.set(user.id);
    this.deleteUserName.set(user.username);
    this.deleteUserPrompt?.close();
    this.deleteUserPrompt = this.modal.open(this.deleteUserPromptTemplate());
  }

  protected showNewUserPrompt() {
    this.usernameEmpty.set(false);
    this.usernameTaken.set(false);
    this.passwordsNotMatching.set(false);
    this.passwordEmpty.set(false);
    this.lockInputs.set(false);

    this.newUserForm.get("username")?.setValue("");
    this.newUserForm.get("password")?.setValue("");
    this.newUserForm.get("confirmPassword")?.setValue("");
    this.newUserForm.get("admin")?.setValue(false);

    this.newUserPrompt = this.modal.open(this.newUserPromptTemplate());
  }

  protected confirmCreateUser() {
    this.usernameEmpty.set(false);
    this.usernameTaken.set(false);
    this.passwordEmpty.set(false);
    this.passwordsNotMatching.set(false);
    let didWarn = false;

    const username = this.newUserForm.get("username")?.value || "";
    if (username.trim().length == 0) {
      didWarn = true;
      this.toast.error("Username can not be empty");
      this.usernameEmpty.set(true);
    }

    const password = this.newUserForm.get("password")?.value || "";
    if (password.trim().length == 0) {
      if (!didWarn) {
        this.toast.error("Password can not be empty");
        didWarn = true;
      }
      this.passwordEmpty.set(true);
    }

    if (didWarn) {
      return;
    }

    const confirmPassword = this.newUserForm.get("confirmPassword")?.value || "";
    if (password != confirmPassword) {
      this.toast.error("Passwords not matching");
      this.passwordsNotMatching.set(true);
      return;
    }

    const superUser = this.newUserForm.get("admin")?.value == true;

    this.lockInputs.set(true);
    this.authApi.createUser({ username, password, superUser }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs.set(false);

        if (err.status == 409) {
          this.toast.error("Username already taken");
          this.usernameTaken.set(true);
          return of(null);
        }

        this.toast.error("Failed to create user");
        throw err;
      })
    ).subscribe(user => {
      this.lockInputs.set(false);

      if (user == null) {
        return;
      }
      this.users.update(u => [...u, user]);
      this.newUserPrompt?.close();
      this.loadUserList();
    });
  }

  protected confirmDeleteUser() {
    this.lockInputs.set(true);
    this.authApi.deleteUser(this.deleteUserId()).pipe(
      catchError(err => {
        this.lockInputs.set(false);
        this.toast.error("Failed to delete user");
        throw err;
      })
    ).subscribe(() => {
      this.lockInputs.set(false);
      this.users.update(u => u.filter(user => user.id != this.deleteUserId()));
      this.toast.success("User deleted");
    });
    this.deleteUserPrompt?.close();
  }
}
