import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { SavedVideo, SaveVideoPayload, VideoDownloaderJobStatus, VideoPlayerApiService, VideoPlayerStatus } from '../../../../core/services/api/video-player-api.service';
import { ToastrService } from 'ngx-toastr';
import { AudioApiService } from '../../../../core/services/api/audio-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup } from '@angular/forms';
import { nullToUndefined, UrlPattern } from '../../../../core/services/utils/Utils';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-video-player-page',
  templateUrl: './video-player-page.component.html',
  styleUrl: './video-player-page.component.scss'
})
export class VideoPlayerPageComponent implements OnInit, OnDestroy {
  videoInputUrl = "";
  mirrorVideo = true;
  stream = false;
  lastStatus: VideoPlayerStatus | null = null;
  updateInterval: any = null;
  volumeUpdateInterval: any = null;
  volume = 0;

  @ViewChild("addVideoModal") addModalTemplate!: TemplateRef<any>;
  addVideoForm = new FormGroup({
    url: new FormControl(""),
    name: new FormControl(""),
    stream: new FormControl(false),
    mirror: new FormControl(false),
    hideUrl: new FormControl(false),
    sorting: new FormControl<number | null>(null),
  })
  savedVideos: SavedVideo[] = [];
  allowEditSavedVideos = false;
  addFormRef: null | NgbModalRef = null;
  isSaving = false;

  startPlayback() {
    if (!UrlPattern.test(this.videoInputUrl)) {
      this.toastr.error("Invalid url");
      return;
    }

    if (this.stream) {
      this.api.streamVideo(this.videoInputUrl).subscribe(_ => {
        this.toastr.success("Stream started");
      });
    } else {
      this.api.playVideo(this.videoInputUrl, this.mirrorVideo).subscribe(() => {
        this.toastr.success("Preparing video");
      });
    }
  }

  stopPlayback() {
    this.api.stopPlayback().subscribe(() => {
      this.toastr.success("Stopping playback");
    });
  }

  update() {
    this.api.getStatus().subscribe(status => {
      this.lastStatus = status;
    });
  }

  updateVolume() {
    this.volumeApi.getVolume().subscribe(data => {
      this.volume = data.volume;
    });
  }

  fetchSavedVideos(clearOldArray = false) {
    if (clearOldArray) {
      this.savedVideos = [];
    }
    this.api.getSavedVideos().subscribe(videos => {
      this.savedVideos = videos;
    });
  }

  get isDownloading() {
    return this.lastStatus?.hasDownloadJob === true;
  }

  onVolumeChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    console.log("Volume target: " + value);
    this.volumeApi.setVolume(value).subscribe();
  }

  get downloadJobStatusText() {
    if (this.lastStatus == null) {
      return "";
    }
    const status = this.lastStatus.downloadJobStatus;

    if (status == VideoDownloaderJobStatus.FAILED) {
      return "Download Failed";
    } else if (status == VideoDownloaderJobStatus.DONE) {
      return "Download successful";
    } else if (status == VideoDownloaderJobStatus.DOWNLOADING) {
      return "Downloading video for processing";
    } else if (status == VideoDownloaderJobStatus.ENCODING_1) {
      return "Encoding (Step 1)";
    } else if (status == VideoDownloaderJobStatus.ENCODING_2) {
      return "Encoding (Step 2)";
    }
    return "Unknown status";
  }

  get isPlaying() {
    return this.lastStatus?.isPlaying === true;
  }

  get showMirrorOption() {
    return this.addVideoForm.get("stream")?.value === false;
  }

  showSaveVideoModal() {
    this.isSaving = false;
    this.addFormRef?.close();
    this.addVideoForm.get("url")?.setValue("");
    this.addVideoForm.get("name")?.setValue("");
    this.addVideoForm.get("stream")?.setValue(false);
    this.addVideoForm.get("mirror")?.setValue(false);
    this.addVideoForm.get("hideUrl")?.setValue(false);
    this.addVideoForm.get("sorting")?.setValue(null);
    this.addFormRef = this.modal.open(this.addModalTemplate, { ariaLabelledBy: 'add-saved-video-modal-title' });
  }

  saveVideo() {
    const url = this.addVideoForm.get("url")!.value;
    const name = this.addVideoForm.get("name")!.value;
    const stream = this.addVideoForm.get("stream")!.value === true;
    const mirror = this.addVideoForm.get("mirror")!.value === true;
    const hideUrl = this.addVideoForm.get("hideUrl")!.value === true;
    const sorting = nullToUndefined(this.addVideoForm.get("sorting")!.value);

    if (url == null || !UrlPattern.test(url)) {
      this.toastr.error("Invalid URL");
      return;
    }

    if (name == null || name.trim().length == 0) {
      this.toastr.error("Invalid name");
      return;
    }

    if (sorting != undefined && isNaN(sorting)) {
      this.toastr.error("Sorting number cant be NaN");
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
    this.api.saveVideo(data).pipe(catchError(err => {
      this.toastr.error("An error occured while trying to save video");
      this.isSaving = false;
      throw err;
    })).subscribe(_ => {
      this.addFormRef?.close();
      this.isSaving = false;
      this.toastr.success("Video saved");
      this.fetchSavedVideos();
    })
  }

  constructor(
    private toastr: ToastrService,
    private api: VideoPlayerApiService,
    private volumeApi: AudioApiService,
    private modal: NgbModal,
  ) { }

  ngOnInit(): void {
    this.update();
    this.updateVolume();
    this.fetchSavedVideos();
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);

    this.volumeUpdateInterval = setInterval(() => {
      this.updateVolume();
    }, 5000);
  }

  ngOnDestroy(): void {
    this.addFormRef?.close();

    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }

    if (this.volumeUpdateInterval != null) {
      clearInterval(this.volumeUpdateInterval);
    }
  }
}
