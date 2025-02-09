import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SaveCustomisableImageRendererPayload, VisorApiService, VisorRenderer, VisorRendererType } from '../../../../core/services/api/visor-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { FilesApiService } from '../../../../core/services/api/files-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-visor-image-face-editor',
  templateUrl: './visor-image-face-editor.component.html',
  styleUrl: './visor-image-face-editor.component.scss'
})
export class VisorImageFaceEditorComponent implements OnInit, OnDestroy {
  @ViewChild("filePicker")
  private filePicker!: ElementRef<any>;

  renderer: VisorRenderer | null = null;
  isLoading = false;
  id = "";

  @ViewChild("deletePrompt") deletePrompt!: ElementRef<any>;
  private deletePromptModal?: NgbModalRef;

  image: string | null = null;
  form = new FormGroup({
    name: new FormControl<string>(""),
    mirrorImage: new FormControl<boolean>(false),
    flipRightSide: new FormControl<boolean>(false),
    flipLeftSide: new FormControl<boolean>(false),
  });

  constructor(
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private visor: VisorApiService,
    private fileApi: FilesApiService,
    private modal: NgbModal,
  ) { }

  public get data(): CustomImageRendererData | null {
    return (this.renderer?.metadata.data as CustomImageRendererData) || null;
  }

  get notFound() {
    return this.renderer == null && !this.isLoading;
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

  confirmDelete() {
    if (this.renderer == null) {
      return;
    }

    this.visor.deleteCustomisableImageVisor(this.renderer.id).pipe(catchError(err => {
      this.toastr.error("Failed to delete renderer");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Renderer deleted");
      this.router.navigate(["/visor"])
    });
  }

  deleteRenderer() {
    this.deletePromptModal?.close();
    this.deletePromptModal = this.modal.open(this.deletePrompt);
  }

  save() {
    if (this.renderer == null) {
      return;
    }

    const data: SaveCustomisableImageRendererPayload = {
      name: this.form.get("name")!.value as string,
      image: this.image,
      mirrorImage: this.form.get("mirrorImage")!.value as boolean,
      flipRightSide: this.form.get("flipRightSide")!.value as boolean,
      flipLeftSide: this.form.get("flipLeftSide")!.value as boolean,
    };

    this.visor.saveCustomisableImageVisor(this.renderer.id, data).pipe(catchError(err => {
      this.toastr.error("Failed to save data");
      throw err;
    })).subscribe(data => {
      this.toastr.success("Saved");
      console.log(data);
    });
  }

  ngOnDestroy(): void {
    this.deletePromptModal?.close();
  }

  ngOnInit(): void {
    this.title.setTitle("Visor image editor - Protogen");

    this.isLoading = true;
    this.route.params.subscribe(params => {
      this.id = String(params['id']);

      this.visor.getRenderer(this.id).subscribe(renderer => {
        this.isLoading = false;
        if (renderer == null) {
          this.toastr.error("Could not find renderer with the provided id");
          return;
        }

        if (renderer.type != VisorRendererType.CustomisableImage) {
          this.toastr.error("Provided renderer id is not of the type \"CustomisableImage\"");
          return;
        }

        this.renderer = renderer;

        this.image = this.data?.image || null;

        if (this.image != null) {
          if (this.image.includes("/")) {
            const split = this.image.split("/");
            this.image = split[split.length - 1];
          }
        }

        this.form.get("name")?.setValue(renderer.name);
        this.form.get("mirrorImage")?.setValue(this.data!.mirrorImage);
        this.form.get("flipRightSide")?.setValue(this.data!.flipRightSide);
        this.form.get("flipLeftSide")?.setValue(this.data!.flipLeftSide);
      })
    });
  }
}

interface CustomImageRendererData {
  image: string | null;
  mirrorImage: boolean;
  flipRightSide: boolean;
  flipLeftSide: boolean;
}
