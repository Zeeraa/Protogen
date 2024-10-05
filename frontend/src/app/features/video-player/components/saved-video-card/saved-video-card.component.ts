import { Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { SavedVideo, SaveVideoPayload, VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { extractYouTubeVideoId, UrlPattern } from '../../../../core/services/utils/Utils';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-saved-video-card',
  templateUrl: './saved-video-card.component.html',
  styleUrl: './saved-video-card.component.scss'
})
export class SavedVideoCardComponent implements OnDestroy {
  @Input({ required: true }) video!: SavedVideo;
  @Input({ required: true }) showEditOptions!: boolean;
  @Output() savedVideoChanged = new EventEmitter<void>();
  isDeleting = false;
  isSaving = false;

  @ViewChild("editVideoModal") editModalTemplate!: TemplateRef<any>;
  editVideoForm = new FormGroup({
    url: new FormControl(""),
    name: new FormControl(""),
    stream: new FormControl(false),
    mirror: new FormControl(false),
    hideUrl: new FormControl(false),
    sorting: new FormControl<number | null>(null),
  })
  editFormRef: null | NgbModalRef = null;

  get isYoutubeVideo() {
    return extractYouTubeVideoId(this.video.url) != null;
  }

  get youtubeVideoId() {
    return extractYouTubeVideoId(this.video.url);
  }

  play() {
    this.api.playSavedVideo(this.video.id).subscribe((result) => {
      this.toastr.success("Playing video " + result.name);
    });
  }

  deleteVideo() {
    this.isDeleting = true;
    this.api.deleteSavedVideo(this.video.id).pipe(catchError(err => {
      this.isDeleting = false;
      this.toastr.error("Failed to delete video");
      throw err;
    })).subscribe(() => {
      this.savedVideoChanged.emit();
    });
  }

  showEditVideo() {
    this.isSaving = false;
    this.editFormRef?.close();
    this.editVideoForm.get("url")?.setValue(this.video.url);
    this.editVideoForm.get("name")?.setValue(this.video.name);
    this.editVideoForm.get("stream")?.setValue(this.video.isStream);
    this.editVideoForm.get("mirror")?.setValue(this.video.mirrorVideo);
    this.editVideoForm.get("hideUrl")?.setValue(this.video.hideUrl);
    this.editVideoForm.get("sorting")?.setValue(this.video.sortingNumber);
    this.editFormRef = this.modal.open(this.editModalTemplate, { ariaLabelledBy: 'edit-saved-video-modal-title' });
  }

  get showMirrorOption() {
    return this.editVideoForm.get("stream")?.value === false;
  }

  saveVideo() {
    const url = this.editVideoForm.get("url")!.value;
    const name = this.editVideoForm.get("name")!.value;
    const stream = this.editVideoForm.get("stream")!.value === true;
    const mirror = this.editVideoForm.get("mirror")!.value === true;
    const hideUrl = this.editVideoForm.get("hideUrl")!.value === true;
    const sorting = this.editVideoForm.get("sorting")!.value;

    if (url == null || !UrlPattern.test(url)) {
      this.toastr.error("Invalid URL");
      return;
    }

    if (name == null || name.trim().length == 0) {
      this.toastr.error("Invalid name");
      return;
    }

    if (sorting == null || isNaN(sorting)) {
      this.toastr.error("Sorting number is invalid");
      return;
    }

    const data: SaveVideoPayload = {
      hideUrl: hideUrl,
      isStream: stream,
      mirrorVideo: mirror,
      name: name,
      url: url,
      sortingNumber: sorting,
    }

    this.isSaving = true;
    this.api.editSavedVideo(this.video.id, data).pipe(catchError(err => {
      this.toastr.error("An error occured while trying to update saved video");
      this.isSaving = false;
      throw err;
    })).subscribe(_ => {
      this.editFormRef?.close();
      this.isSaving = false;
      this.toastr.success("Video saved");
      this.savedVideoChanged.emit();
    })
  }

  constructor(
    private api: VideoPlayerApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
  ) { }

  ngOnDestroy(): void {
    this.editFormRef?.close();
  }
}
