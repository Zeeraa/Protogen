import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VideoPlayerApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  playVideo(url: string, mirror: boolean, flip: boolean) {
    const payload = {
      url: url,
      mirrorVideo: mirror,
      flipVideo: flip,
    }

    return this.http.post<VideoDownloadJob>(this.apiBaseUrl + "/video_player/play", payload).pipe(catchError(this.defaultErrorHandler));
  }

  streamVideo(url: string) {
    const payload = {
      url: url,
    }

    return this.http.post(this.apiBaseUrl + "/video_player/stream", payload).pipe(catchError(this.defaultErrorHandler));
  }

  stopPlayback() {
    return this.http.post(this.apiBaseUrl + "/video_player/stop", {}).pipe(catchError(this.defaultErrorHandler));
  }

  getStatus() {
    return this.http.get<VideoPlayerStatus>(this.apiBaseUrl + "/video_player/status").pipe(catchError(this.defaultErrorHandler));
  }

  getSavedVideos() {
    return this.http.get<SavedVideo[]>(this.apiBaseUrl + "/video_player/saved").pipe(catchError(this.defaultErrorHandler));
  }

  saveVideo(data: SaveVideoPayload) {
    return this.http.post<SavedVideo>(this.apiBaseUrl + "/video_player/saved", data).pipe(catchError(this.defaultErrorHandler));
  }

  editSavedVideo(id: number, data: SaveVideoPayload) {
    return this.http.put<SavedVideo>(this.apiBaseUrl + "/video_player/saved/" + id, data).pipe(catchError(this.defaultErrorHandler));
  }

  playSavedVideo(id: number) {
    return this.http.post<SavedVideo>(this.apiBaseUrl + "/video_player/saved/" + id + "/play", {}).pipe(catchError(this.defaultErrorHandler));
  }

  deleteSavedVideo(id: number) {
    return this.http.delete(this.apiBaseUrl + "/video_player/saved/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  getGroups() {
    return this.http.get<VideoGroup[]>(this.apiBaseUrl + "/video_player/groups").pipe(catchError(this.defaultErrorHandler));
  }

  createGroup(group: AlterGroupModel) {
    return this.http.post<VideoGroup>(this.apiBaseUrl + "/video_player/groups", group).pipe(catchError(this.defaultErrorHandler));
  }

  editGroup(id: number, group: AlterGroupModel) {
    return this.http.put<VideoGroup>(this.apiBaseUrl + "/video_player/groups/" + id, group).pipe(catchError(this.defaultErrorHandler));
  }

  deleteGroup(id: number) {
    return this.http.delete(this.apiBaseUrl + "/video_player/groups/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  clearCache() {
    return this.http.delete(this.apiBaseUrl + "/video_player/cache").pipe(catchError(this.defaultErrorHandler));
  }
}

interface AlterGroupModel {
  name: string;
}

export interface VideoGroup {
  id: number;
  name: string;
}

export interface SaveVideoPayload {
  sortingNumber?: number;
  name: string;
  url: string;
  mirrorVideo: boolean;
  flipVideo: boolean;
  isStream: boolean;
  hideUrl: boolean;
  groupId: number | null;
}

export interface PlaySavedVideoResponse extends SavedVideo {
  downloadJob: VideoDownloadJob | null;
}

export interface VideoDownloadJob {
  jobId: string
  createdAt: string
  status: string
  videoUrl: string
  mirrorVideo: boolean
  outputHash: string
  errorMessage: string
}


export interface SavedVideo {
  id: number;
  sortingNumber: number;
  name: string;
  url: string;
  mirrorVideo: boolean;
  flipVideo: boolean;
  isStream: boolean;
  hideUrl: boolean;
  group: VideoGroup | null;
}

export interface VideoGroup {
  id: number;
  name: string;
}

export interface VideoPlayerStatus {
  hasDownloadJob: boolean;
  downloadJobStatus: VideoDownloaderJobStatus;
  isPlaying: boolean,
}

export enum VideoDownloaderJobStatus {
  CREATED = "CREATED",
  DOWNLOADING = "DOWNLOADING",
  ENCODING_1 = "ENCODING_1",
  ENCODING_2 = "ENCODING_2",
  FAILED = "FAILED",
  DONE = "DONE",
}
