import { Component, EventEmitter, inject, Input, OnDestroy, Output, TemplateRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { SavedVideo, SaveVideoPayload, VideoGroup, VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { extractYouTubeVideoId, UrlPattern } from '../../../../core/services/utils/Utils';
import { ToastService } from 'ngx-yet-another-toast-library';
import { catchError } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-saved-video-card',
  templateUrl: './saved-video-card.component.html',
  styleUrl: './saved-video-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class SavedVideoCardComponent implements OnDestroy {
  private readonly api = inject(VideoPlayerApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(NgbModal);

  @Input({ required: true }) video!: SavedVideo;
  @Input({ required: true }) showEditOptions!: boolean;
  @Input({ required: true }) groups!: VideoGroup[];
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
    flip: new FormControl(false),
    sorting: new FormControl<number | null>(null),
    groupId: new FormControl<number>(-1),
  })
  editFormRef: null | NgbModalRef = null;

  get isYoutubeVideo() {
    return extractYouTubeVideoId(this.video.url) != null;
  }

  get youtubeVideoId() {
    return extractYouTubeVideoId(this.video.url);
  }

  play() {
    this.api.playSavedVideo(this.video.id).pipe(catchError(err => {
      console.error('Failed to play video', err);
      this.toast.error("Failed to play video");
      return [];
    })).subscribe(result => {
      this.toast.success("Playing video " + result.name);
    });
  }

  deleteVideo() {
    this.isDeleting = true;
    this.api.deleteSavedVideo(this.video.id).pipe(catchError(err => {
      this.isDeleting = false;
      this.toast.error("Failed to delete video");
      throw err;
    })).subscribe(() => {
      this.savedVideoChanged.emit();
    });
  }

  showEditVideo() {
    const groupId = this.video.group == null ? -1 : this.video.group.id;

    this.isSaving = false;
    this.editFormRef?.close();
    this.editVideoForm.get("url")?.setValue(this.video.url);
    this.editVideoForm.get("name")?.setValue(this.video.name);
    this.editVideoForm.get("stream")?.setValue(this.video.isStream);
    this.editVideoForm.get("mirror")?.setValue(this.video.mirrorVideo);
    this.editVideoForm.get("hideUrl")?.setValue(this.video.hideUrl);
    this.editVideoForm.get("flip")?.setValue(this.video.flipVideo);
    this.editVideoForm.get("sorting")?.setValue(this.video.sortingNumber);
    this.editVideoForm.get("groupId")?.setValue(groupId);
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
    const flip = this.editVideoForm.get("flip")!.value === true;
    const sorting = this.editVideoForm.get("sorting")!.value;
    const rawGroupId = this.editVideoForm.get("groupId")?.value || -1;
    const groupId = rawGroupId == -1 ? null : parseInt(String(rawGroupId));

    if (url == null || !UrlPattern.test(url)) {
      this.toast.error("Invalid URL");
      return;
    }

    if (name == null || name.trim().length == 0) {
      this.toast.error("Invalid name");
      return;
    }

    if (sorting == null || isNaN(sorting)) {
      this.toast.error("Sorting number is invalid");
      return;
    }

    const data: SaveVideoPayload = {
      hideUrl: hideUrl,
      isStream: stream,
      mirrorVideo: mirror,
      name: name,
      url: url,
      flipVideo: flip,
      sortingNumber: sorting,
      groupId: groupId,
    }

    this.isSaving = true;
    this.api.editSavedVideo(this.video.id, data).pipe(catchError(err => {
      this.toast.error("An error occurred while trying to update saved video");
      this.isSaving = false;
      throw err;
    })).subscribe(_ => {
      this.editFormRef?.close();
      this.isSaving = false;
      this.toast.success("Video saved");
      this.savedVideoChanged.emit();
    })
  }

  ngOnDestroy(): void {
    this.editFormRef?.close();
  }
}
