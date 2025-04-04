import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page/dashboard-page.component';
import { VisorPageComponent } from './features/visor/pages/visor-page/visor-page.component';
import { VideoPlayerPageComponent } from './features/video-player/pages/video-player-page/video-player-page.component';
import { SystemPageComponent } from './features/system/pages/system-page/system-page.component';
import { RgbDashboardPageComponent } from './features/rgb/pages/rgb-dashboard-page/rgb-dashboard-page.component';
import { RgbEditorPageComponent } from './features/rgb/pages/rgb-editor-page/rgb-editor-page.component';
import { LogsPageComponent } from './features/logs/pages/logs-page/logs-page.component';
import { VisorImageFaceEditorComponent } from './features/visor/pages/visor-image-face-editor/visor-image-face-editor.component';
import { UserManagerPageComponent } from './features/user-manager/pages/user-manager-page/user-manager-page.component';
import { ApiKeyManagerPageComponent } from './features/api-key-manager/pages/api-key-manager-page/api-key-manager-page.component';
import { ProtogenFaceEditorComponent } from './features/visor/pages/protogen-face-editor/protogen-face-editor.component';
import { ActionsPageComponent } from './features/actions/pages/actions-page/actions-page.component';
import { AuthPageComponent } from './features/auth/pages/auth-page/auth-page.component';
import { AudioVisualizerSettingsPageComponent } from './features/audio-visualizer/pages/audio-visualizer-settings-page/audio-visualizer-settings-page.component';
import { JoystickRemoteSettingsPageComponent } from './features/remote-settings-page/pages/remote-settings-page/joystick-remote-settings-page.component';

export const routes: Routes = [
  {
    path: "",
    component: DashboardPageComponent,
  },
  {
    path: "visor",
    children: [
      {
        path: "",
        component: VisorPageComponent,
      },
      {
        path: "image/:id",
        component: VisorImageFaceEditorComponent,
      },
      {
        path: "face",
        component: ProtogenFaceEditorComponent,
      }
    ]
  },
  {
    path: "video-player",
    component: VideoPlayerPageComponent,
  },
  {
    path: "system",
    component: SystemPageComponent,
  },
  {
    path: "rgb",
    children: [
      {
        path: "",
        component: RgbDashboardPageComponent,
      },
      {
        path: "editor/:id",
        component: RgbEditorPageComponent,
      }
    ]
  },
  {
    path: "logs",
    component: LogsPageComponent,
  },
  {
    path: "users",
    component: UserManagerPageComponent,
  },
  {
    path: "keys",
    component: ApiKeyManagerPageComponent,
  },
  {
    path: "remote/joystick",
    component: JoystickRemoteSettingsPageComponent,
  },
  {
    path: "actions",
    component: ActionsPageComponent,
  },
  {
    path: "auth",
    component: AuthPageComponent,
  },
  {
    path: "audio-visualizer",
    component: AudioVisualizerSettingsPageComponent,
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
