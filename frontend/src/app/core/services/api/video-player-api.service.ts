import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';

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

  playVideo(url: string, mirror: boolean): Observable<VideoDownloadJob> {
    const payload = {
      url: url,
      mirrorVideo: mirror,
    }

    return this.http.post(this.apiBaseUrl + "/video_player/play", payload).pipe(catchError(this.defaultErrorHandler)) as any as Observable<VideoDownloadJob>;
  }

  streamVideo(url: string): Observable<any> {
    const payload = {
      url: url,
    }

    return this.http.post(this.apiBaseUrl + "/video_player/stream", payload).pipe(catchError(this.defaultErrorHandler));
  }

  stopPlayback(): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/video_player/stop", {}).pipe(catchError(this.defaultErrorHandler));
  }

  getStatus(): Observable<VideoPlayerStatus> {
    return this.http.get(this.apiBaseUrl + "/video_player/status").pipe(catchError(this.defaultErrorHandler)) as any as Observable<VideoPlayerStatus>;
  }

  getSavedVideos(): Observable<SavedVideo[]> {
    return this.http.get(this.apiBaseUrl + "/video_player/saved").pipe(catchError(this.defaultErrorHandler)) as any as Observable<SavedVideo[]>;
  }

  saveVideo(data: SaveVideoPayload): Observable<SavedVideo[]> {
    return this.http.post(this.apiBaseUrl + "/video_player/saved", data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<SavedVideo[]>;
  }

  editSavedVideo(id: number, data: SaveVideoPayload): Observable<SavedVideo[]> {
    return this.http.put(this.apiBaseUrl + "/video_player/saved/" + id, data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<SavedVideo[]>;
  }

  playSavedVideo(id: number): Observable<SavedVideo> {
    return this.http.post(this.apiBaseUrl + "/video_player/saved/" + id + "/play", {}).pipe(catchError(this.defaultErrorHandler)) as any as Observable<SavedVideo>;
  }

  deleteSavedVideo(id: number): Observable<PlaySavedVideoResponse> {
    return this.http.delete(this.apiBaseUrl + "/video_player/saved/" + id).pipe(catchError(this.defaultErrorHandler)) as any as Observable<PlaySavedVideoResponse>;
  }
}

export interface SaveVideoPayload {
  sortingNumber?: number;
  name: string;
  url: string;
  mirrorVideo: boolean;
  isStream: boolean;
  hideUrl: boolean;
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
  isStream: boolean;
  hideUrl: boolean;
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
