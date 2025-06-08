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
import { AuthGuard } from './core/guards/auth-guard.guard';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { AppsPageComponent } from './features/apps/pages/apps-page/apps-page.component';
import { PaintAppPageComponent } from './features/apps/ui/paint/paint-app-page/paint-app-page.component';
import { DeveloperPageComponent } from './features/dev/pages/developer-page/developer-page.component';

export const routes: Routes = [
  {
    path: "",
    component: DashboardPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "login",
    component: LoginPageComponent,
  },
  {
    path: "visor",
    children: [
      {
        path: "",
        component: VisorPageComponent,
        canActivate: [AuthGuard],
      },
      {
        path: "image/:id",
        component: VisorImageFaceEditorComponent,
        canActivate: [AuthGuard],
      },
      {
        path: "face",
        component: ProtogenFaceEditorComponent,
        canActivate: [AuthGuard],
      }
    ]
  },
  {
    path: "video-player",
    component: VideoPlayerPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "system",
    component: SystemPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "rgb",
    children: [
      {
        path: "",
        component: RgbDashboardPageComponent,
        canActivate: [AuthGuard],
      },
      {
        path: "editor/:id",
        component: RgbEditorPageComponent,
        canActivate: [AuthGuard],
      }
    ]
  },
  {
    path: "logs",
    component: LogsPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "users",
    component: UserManagerPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "keys",
    component: ApiKeyManagerPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "remote/joystick",
    component: JoystickRemoteSettingsPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "actions",
    component: ActionsPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "auth",
    component: AuthPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "audio-visualizer",
    component: AudioVisualizerSettingsPageComponent,
  },
  {
    path: "apps",
    children: [
      {
        path: "",
        component: AppsPageComponent,
        canActivate: [AuthGuard],
      },
      {
        path: "paint",
        component: PaintAppPageComponent,
      }
    ]
  },
  {
    path: "dev",
    component: DeveloperPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
