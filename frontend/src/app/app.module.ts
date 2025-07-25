import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NavbarModule } from './features/navbar/navbar.module';
import { VisorModule } from './features/visor/visor.module';
import { VideoPlayerModule } from './features/video-player/video-player.module';
import { SystemModule } from './features/system/system.module';
import { RgbModule } from './features/rgb/rgb.module';
import { LogsModule } from './features/logs/logs.module';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserManagerModule } from './features/user-manager/user-manager.module';
import { ApiKeyManagerModule } from './features/api-key-manager/api-key-manager.module';
import { RemoteSettingsPageModule } from './features/remote-settings-page/remote-settings-page.module';
import { ActionsModule } from './features/actions/actions.module';
import { AuthModule } from './features/auth/auth.module';
import { AudioVisualizerModule } from './features/audio-visualizer/audio-visualizer.module';
import { AppsModule } from './features/apps/apps.module';
import { DevModule } from './features/dev/dev.module';
import { BoopSensorModule } from './features/boop-sensor/boop-sensor.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    DashboardModule,
    NavbarModule,
    VisorModule,
    VideoPlayerModule,
    SystemModule,
    RgbModule,
    LogsModule,
    FormsModule,
    ReactiveFormsModule,
    UserManagerModule,
    ApiKeyManagerModule,
    RemoteSettingsPageModule,
    ActionsModule,
    AuthModule,
    AudioVisualizerModule,
    AppsModule,
    DevModule,
    BoopSensorModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }


