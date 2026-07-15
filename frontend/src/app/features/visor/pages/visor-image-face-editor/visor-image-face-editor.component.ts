import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from 'ngx-yet-another-toast-library';
import { SaveCustomisableImageRendererPayload, VisorApiService, VisorRenderer, VisorRendererType } from '../../../../core/services/api/visor-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { FilesApiService } from '../../../../core/services/api/files-api.service';
import { catchError } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-visor-image-face-editor',
  templateUrl: './visor-image-face-editor.component.html',
  styleUrl: './visor-image-face-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class VisorImageFaceEditorComponent implements OnInit, OnDestroy {
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly visor = inject(VisorApiService);
  private readonly fileApi = inject(FilesApiService);
  private readonly modal = inject(NgbModal);

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

  public get data(): CustomImageRendererData | null {
    return (this.renderer?.metadata.data as CustomImageRendererData) || null;
  }

  get notFound() {
    return this.renderer == null && !this.isLoading;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.toast.info("Uploading and processing file. This might take some time...");
      this.fileApi.uploadImage(file, { remoteGifProcessing: true }).pipe(catchError((err) => {
        this.toast.error("Failed to upload file");
        this.filePicker.nativeElement.value = null;
        throw err;
      })).subscribe((result) => {
        this.toast.success("Image upploaded successfully");
        this.image = result.resource;
      })
    }
  }

  confirmDelete() {
    if (this.renderer == null) {
      return;
    }

    this.visor.deleteCustomisableImageVisor(this.renderer.id).pipe(catchError(err => {
      this.toast.error("Failed to delete renderer");
      throw err;
    })).subscribe(() => {
      this.toast.success("Renderer deleted");
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
      this.toast.error("Failed to save data");
      throw err;
    })).subscribe(data => {
      this.toast.success("Saved");
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

      this.visor.getRenderer(this.id).pipe(catchError(err => {
        this.isLoading = false;
        console.error('Failed to load renderer', err);
        this.toast.error("Failed to load renderer");
        return [];
      })).subscribe(renderer => {
        this.isLoading = false;
        if (renderer == null) {
          this.toast.error("Could not find renderer with the provided id");
          return;
        }

        if (renderer.type != VisorRendererType.CustomisableImage) {
          this.toast.error("Provided renderer id is not of the type \"CustomisableImage\"");
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
