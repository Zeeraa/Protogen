import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, NgZone, OnDestroy, signal, TemplateRef, viewChild, ViewChild } from '@angular/core';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { catchError, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from 'ngx-yet-another-toast-library';

interface QrCodeDetection {
  rawValue: string;
}

interface QrCodeDetector {
  detect(source: HTMLVideoElement): Promise<QrCodeDetection[]>;
}

interface QrCodeDetectorConstructor {
  new(options: { formats: string[] }): QrCodeDetector;
}

@Component({
  selector: 'app-auth-page',
  standalone: false,
  templateUrl: './auth-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent implements AfterViewInit, OnDestroy {
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modal = inject(NgbModal);
  private readonly zone = inject(NgZone);
  private readonly qrVideo = viewChild.required<ElementRef<HTMLVideoElement>>('qrVideo');
  protected readonly isScanning = signal(false);
  protected readonly scannerError = signal<string | null>(null);

  code = "";
  private scannerStream: MediaStream | null = null;
  private scannerInterval: ReturnType<typeof setInterval> | null = null;
  private scannerStartId = 0;

  @ViewChild("confirmScannedCodeModal") private confirmScannedCodeModalTemplate!: TemplateRef<any>;
  private confirmScannedCodeModal?: NgbModalRef;
  private confirmScannedCodeModalClosedSubscription?: Subscription;

  approveLogin() {
    if (this.code.trim().length != 8) {
      this.toast.error("Invalid code");
      return;
    }

    this.confirmScannedCodeModal?.close();

    this.authApi.approveLogin(this.code).pipe(
      catchError(err => {
        this.toast.error("Failed to approve login");
        throw err;
      })
    ).subscribe(response => {
      if (response == null) {
        this.toast.error("Invalid or expired code");
      } else {
        this.code = "";
        this.toast.success("Login approved");
      }
    })
  }

  ngAfterViewInit(): void {
    const signinKey = this.route.snapshot.queryParams['signinKey'];
    if (signinKey != null) {
      this.code = signinKey;

      this.confirmScannedCodeModal = this.modal.open(this.confirmScannedCodeModalTemplate, {
        backdrop: 'static',
        keyboard: false,
      });

      this.confirmScannedCodeModalClosedSubscription = this.confirmScannedCodeModal.closed.subscribe(() => {
        // Alter the url to not include the code anymore
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { signinKey: null },
          queryParamsHandling: 'merge',
        }).then(() => {
          this.code = "";
        });

      });
    }
  }

  protected async startQrScanner() {
    if (this.isScanning()) {
      return;
    }

    const Detector = (window as Window & { BarcodeDetector?: QrCodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      this.scannerError.set("QR scanning is not supported by this browser");
      return;
    }

    const startId = ++this.scannerStartId;
    this.isScanning.set(true);
    this.scannerError.set(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });

      if (startId !== this.scannerStartId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      this.scannerStream = stream;
      const video = this.qrVideo().nativeElement;
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({ formats: ["qr_code"] });
      let detectionInProgress = false;
      this.scannerInterval = setInterval(async () => {
        if (detectionInProgress || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return;
        }

        detectionInProgress = true;
        try {
          const [result] = await detector.detect(video);
          if (startId !== this.scannerStartId || !result) {
            return;
          }

          const signinKey = this.extractSigninKey(result.rawValue);
          if (signinKey != null) {
            this.zone.run(() => {
              this.code = signinKey;
              this.stopQrScanner();
            });
          }
        } catch (error) {
          if (startId === this.scannerStartId) {
            this.zone.run(() => {
              this.scannerError.set("Failed to scan QR code");
              this.stopQrScanner();
            });
            console.error(error);
          }
        } finally {
          detectionInProgress = false;
        }
      }, 200);
    } catch (error) {
      if (startId === this.scannerStartId) {
        this.scannerError.set("Unable to access the camera for QR scanning");
        this.stopQrScanner();
      }
      console.error(error);
    }
  }

  protected stopQrScanner() {
    this.scannerStartId++;
    if (this.scannerInterval != null) {
      clearInterval(this.scannerInterval);
      this.scannerInterval = null;
    }
    this.scannerStream?.getTracks().forEach(track => track.stop());
    this.scannerStream = null;

    const video = this.qrVideo().nativeElement;
    video.pause();
    video.srcObject = null;
    this.isScanning.set(false);
  }

  private extractSigninKey(value: string): string | null {
    try {
      const url = new URL(value);
      if (url.pathname !== "/auth") {
        return null;
      }

      const signinKey = url.searchParams.get("signinKey");
      return signinKey != null && /^\d{8}$/.test(signinKey) ? signinKey : null;
    } catch {
      return null;
    }
  }

  ngOnDestroy(): void {
    this.stopQrScanner();
    this.confirmScannedCodeModalClosedSubscription?.unsubscribe();
  }
}
