import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
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
import { ActionsModule } from './features/actions/actions.module';
import { AuthModule } from './features/auth/auth.module';
import { AudioVisualizerModule } from './features/audio-visualizer/audio-visualizer.module';
import { AppsModule } from './features/apps/apps.module';
import { DevModule } from './features/dev/dev.module';
import { BoopSensorModule } from './features/boop-sensor/boop-sensor.module';
import { BluetoothModule } from './features/bluetooth/bluetooth.module';
import { WifiModule } from './features/wifi/wifi.module';
import { RemoteModule } from './features/remote/remote.module';
import { provideToastService } from "ngx-yet-another-toast-library";

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
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
    ActionsModule,
    AuthModule,
    AudioVisualizerModule,
    AppsModule,
    DevModule,
    BoopSensorModule,
    BluetoothModule,
    WifiModule,
    RemoteModule,
  ],
  providers: [
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    provideToastService({
      defaultOptions: {
        progressBar: true,
      }
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }


