import { Component, model, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiKey, ApiKeyApi } from '../../../../core/services/api/api-key-api.service';
import { catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-api-key-manager-page',
  templateUrl: './api-key-manager-page.component.html',
  styleUrl: './api-key-manager-page.component.scss'
})
export class ApiKeyManagerPageComponent implements OnInit, OnDestroy {
  protected apiKeys: ApiKey[] = [];

  private deleteKeyPrompt: NgbModalRef | null = null;
  @ViewChild("deleteKeyPrompt") private deleteKeyPromptTemplate!: TemplateRef<any>;
  deleteKeyName = "";

  private createKeyPrompt: NgbModalRef | null = null;
  @ViewChild("createKeyPrompt") private createKeyPromptTemplate!: TemplateRef<any>;

  constructor(
    private toastr: ToastrService,
    private api: ApiKeyApi,
    private modal: NgbModal,
  ) { }

  newApiKeyForm = new FormGroup({
    name: new FormControl<string>(""),
    superUser: new FormControl<boolean>(false),
  });

  fetchData() {
    this.api.getAllKeys().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status == 403) {
          this.toastr.error("You dont have access to view api keys");
          console.error("Got access denied while trying to read api keys");
          return of([]);
        }

        this.toastr.error("Failed to load api keys");
        throw err;
      })
    ).subscribe(keys => {
      this.apiKeys = keys;
    })
  }

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.createKeyPrompt?.close();
    this.deleteKeyPrompt?.close();
  }

  openKeyCreatorPrompt() {
    this.createKeyPrompt?.close();
    this.createKeyPrompt = this.modal.open(this.createKeyPromptTemplate);
  }

  openDeleteKeyPrompt(key: ApiKey) {
    this.deleteKeyName = key.name;
    this.deleteKeyPrompt?.close();
    this.deleteKeyPrompt = this.modal.open(this.deleteKeyPromptTemplate);
  }
}
