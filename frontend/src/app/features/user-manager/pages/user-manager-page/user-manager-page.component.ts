import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthApiService, ProtogenUser } from '../../../../core/services/api/auth-api.service';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

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

  showPasswordChange(user: ProtogenUser) {

  }

  showDeletePrompt(user: ProtogenUser) {
    this.deleteUserId = user.id;
    this.deleteUserName = user.username;
    this.deleteUserPrompt?.close();
    this.deleteUserPrompt = this.modal.open(this.deleteUserPromptTemplate);
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
  }

  get isAdmin() {
    return this.auth.authDetails?.isSuperUser || false;
  }

  get userId() {
    return this.auth.authDetails?.userId || -1;
  }
}
