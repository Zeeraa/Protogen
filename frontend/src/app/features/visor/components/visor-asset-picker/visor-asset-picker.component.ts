import { Component, ElementRef, forwardRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AssetsApiService, BuiltInAsset } from '../../../../core/services/api/assets-api.service';
import { ToastrService } from 'ngx-toastr';
import { FilesApiService } from '../../../../core/services/api/files-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { uuidv7 } from 'uuidv7';

@Component({
    selector: 'app-visor-asset-picker',
    templateUrl: './visor-asset-picker.component.html',
    styleUrl: './visor-asset-picker.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => VisorAssetPickerComponent),
            multi: true
        }
    ],
    standalone: false
})
export class VisorAssetPickerComponent implements ControlValueAccessor, OnInit, OnDestroy {
  //#region ControlValueAccessor
  private _image: string | null = null;
  private _disabled = false;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: any) => void = () => { };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => { };
  //#endregion

  @Input() showInvalid = false;
  private _instanceId = uuidv7();
  private _assetGroups: GroupedAssets[] = [];

  @ViewChild("imageFilePicker") private filePicker!: ElementRef<any>;

  private assetModal?: NgbModalRef;
  @ViewChild("assetPickerModal") private assetModalTemplate!: ElementRef<any>;

  get instanceId() {
    return this._instanceId;
  }

  get assetGroups() {
    return this._assetGroups;
  }

  get image() {
    return this._image;
  }

  set image(value: string | null) {
    this._image = value;
    this.onChange(value);
  }

  get activeImageUrl() {
    if (this.image != null) {
      if (this.image.startsWith("asset://")) {
        const name = this.image.split("://")[1];
        const url = this.assetApi.getAssetUrlByName(name);
        if (url != null) {
          return url;
        }
      } else {
        return this.assetApi.apiBaseUrl + "/images/get/" + this.image;
      }
    }
    return "/visor_blank.png";
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.toastr.info("Uploading and processing file. This might take some time...");
      this.fileApi.uploadImage(file, { remoteGifProcessing: true }).pipe(catchError((err) => {
        this.toastr.error("Failed to upload file");
        this.filePicker.nativeElement.value = null;
        throw err;
      })).subscribe((result) => {
        this.toastr.success("Image upploaded successfully");
        this.image = result.resource;
      })
    }
  }

  openAssetPicker() {
    this.assetModal?.close();
    this.assetModal = this.modal.open(this.assetModalTemplate, { size: "lg" });
  }

  writeValue(value: any): void {
    this.image = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
  }

  get disabled() {
    return this._disabled;
  }

  touched() {
    this.onTouched();
  }

  ngOnDestroy(): void {
    console.debug("VisorAssetPickerComponent::ngOnDestroy()");
    this.assetModal?.close();
  }

  ngOnInit(): void {
    console.debug("VisorAssetPickerComponent::ngOnInit()");
    this.assetApi.getAssets(true).pipe(catchError(err => {
      this.toastr.error("Failed to fetch built-in assets. Image picker might not work correctly.");
      throw err;
    })).subscribe(assets => {
      this._assetGroups = [];
      assets.forEach(asset => {
        const group = this._assetGroups.find(g => g.name == asset.group);
        if (group == null) {
          this._assetGroups.push({
            name: asset.group,
            assets: [asset]
          });
        } else {
          group.assets.push(asset);
        }
      });
    });
  }

  selectAsset(asset: BuiltInAsset) {
    this.image = "asset://" + asset.name;
    this.assetModal?.close();
  }

  getAssetUrl(asset: BuiltInAsset) {
    return this.assetApi.getAssetUrl(asset);
  }

  constructor(
    private assetApi: AssetsApiService,
    private toastr: ToastrService,
    private fileApi: FilesApiService,
    private modal: NgbModal,
  ) { }
}

interface GroupedAssets {
  name: string;
  assets: BuiltInAsset[];
}
