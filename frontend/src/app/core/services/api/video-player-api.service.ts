import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class VideoPlayerApiService extends ApiBaseService {
  playVideo(url: string, mirror: boolean, flip: boolean) {
    const payload = {
      url: url,
      mirrorVideo: mirror,
      flipVideo: flip,
    }

    return this.http.post<VideoDownloadJob>(this.apiBaseUrl + "/video_player/play", payload);
  }

  streamVideo(url: string) {
    const payload = {
      url: url,
    }

    return this.http.post(this.apiBaseUrl + "/video_player/stream", payload);
  }

  stopPlayback() {
    return this.http.post(this.apiBaseUrl + "/video_player/stop", {});
  }

  getStatus() {
    return this.http.get<VideoPlayerStatus>(this.apiBaseUrl + "/video_player/status");
  }

  getSavedVideos() {
    return this.http.get<SavedVideo[]>(this.apiBaseUrl + "/video_player/saved");
  }

  saveVideo(data: SaveVideoPayload) {
    return this.http.post<SavedVideo>(this.apiBaseUrl + "/video_player/saved", data);
  }

  editSavedVideo(id: number, data: SaveVideoPayload) {
    return this.http.put<SavedVideo>(this.apiBaseUrl + "/video_player/saved/" + id, data);
  }

  playSavedVideo(id: number) {
    return this.http.post<SavedVideo>(this.apiBaseUrl + "/video_player/saved/" + id + "/play", {});
  }

  deleteSavedVideo(id: number) {
    return this.http.delete(this.apiBaseUrl + "/video_player/saved/" + id);
  }

  getGroups() {
    return this.http.get<VideoGroup[]>(this.apiBaseUrl + "/video_player/groups");
  }

  createGroup(group: AlterGroupModel) {
    return this.http.post<VideoGroup>(this.apiBaseUrl + "/video_player/groups", group);
  }

  editGroup(id: number, group: AlterGroupModel) {
    return this.http.put<VideoGroup>(this.apiBaseUrl + "/video_player/groups/" + id, group);
  }

  deleteGroup(id: number) {
    return this.http.delete(this.apiBaseUrl + "/video_player/groups/" + id);
  }

  clearCache() {
    return this.http.delete(this.apiBaseUrl + "/video_player/cache");
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
