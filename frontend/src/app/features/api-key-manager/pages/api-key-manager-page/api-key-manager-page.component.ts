import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiKey, ApiKeyApi } from '../../../../core/services/api/api-key-api.service';
import { catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ClipboardService } from 'ngx-clipboard'

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
  deleteKeyKey = ""; // Stupid name

  private createKeyPrompt: NgbModalRef | null = null;
  @ViewChild("createKeyPrompt") private createKeyPromptTemplate!: TemplateRef<any>;
  newApiKeyForm = new FormGroup({
    name: new FormControl<string>(""),
    superUser: new FormControl<boolean>(false),
  });
  nameEmpty = false;
  nameTaken = false;
  lockInputs = false;

  showKeys = false;

  getKeyText(key: string) {
    if (this.showKeys) {
      return key;
    }
    return "************************************";
  }

  constructor(
    private toastr: ToastrService,
    private api: ApiKeyApi,
    private modal: NgbModal,
    private clipboard: ClipboardService,
  ) { }

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
    this.nameEmpty = false;
    this.nameTaken = false;

    this.newApiKeyForm.get("name")?.setValue("");
    this.newApiKeyForm.get("superUser")?.setValue(false);

    this.createKeyPrompt?.close();
    this.createKeyPrompt = this.modal.open(this.createKeyPromptTemplate);
  }

  confirmCreateKey() {
    this.nameEmpty = false;
    this.nameTaken = false;
    this.lockInputs = false;

    const name = this.newApiKeyForm.get("name")?.value || "";

    if (name.trim().length == 0) {
      this.nameEmpty = true;
      this.toastr.error("Name can not be empty");
      return;
    }

    const superUser = this.newApiKeyForm.get("superUser")?.value == true;

    this.lockInputs = true;

    this.api.createKey({ name, superUser }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;

        if (err.status == 409) {
          this.toastr.error("Name already in use by other key");
          this.nameTaken = true;
          return of(null);
        }

        this.toastr.error("Failed to create key");
        throw err;
      })
    ).subscribe(key => {
      this.lockInputs = false;
      if (key == null) {
        return;
      }

      this.toastr.success("Api key created");
      this.createKeyPrompt?.close();
      this.apiKeys.push(key);
    });
  }

  openDeleteKeyPrompt(key: ApiKey) {
    this.deleteKeyName = key.name;
    this.deleteKeyKey = key.apiKey;
    this.lockInputs = false;

    this.deleteKeyPrompt?.close();
    this.deleteKeyPrompt = this.modal.open(this.deleteKeyPromptTemplate);
  }

  confirmDeleteKey() {
    this.api.deleteKey(this.deleteKeyKey).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;
        this.toastr.error("Failed to delete key");
        throw err;
      })
    ).subscribe(key => {
      this.lockInputs = false;

      this.toastr.success("Api key deleted");
      this.deleteKeyPrompt?.close();
      this.apiKeys = this.apiKeys.filter(k => k.apiKey != this.deleteKeyKey);
    });
  }

  copyText(text: string) {
    this.clipboard.copy(text);
    this.toastr.success("Text copied to clipboard");
  }
}
