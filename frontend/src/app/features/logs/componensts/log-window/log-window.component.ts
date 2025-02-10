import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';
import { SystemApiService } from '../../../../core/services/api/system-api.service';
import { ConsoleColor } from '../../../../core/services/utils/ConsoleColors';
import { catchError, Subscription } from 'rxjs';
import { NavbarService } from '../../../../core/services/navbar.service';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { SocketEventType } from '../../../../core/services/socket/data/SocketEventType';

@Component({
    selector: 'app-log-window',
    templateUrl: './log-window.component.html',
    styleUrl: './log-window.component.scss',
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class LogWindowComponent implements AfterViewInit, OnDestroy {
  private terminal!: Terminal;
  private fitAddon!: FitAddon;
  private navbarChangeSubscription: Subscription | null = null;
  private socketMessageSubscription: Subscription | null = null;
  private socketEventSubscription: Subscription | null = null;
  private readSocketMessages = false;
  private sessionId: string | null = null;
  private sessionCheckInterval: any = null;

  @ViewChild('terminal')
  private terminalDiv!: ElementRef<HTMLElement>;

  constructor(
    private system: SystemApiService,
    private navbarService: NavbarService,
    private socketService: SocketService,
  ) { }

  ngAfterViewInit(): void {
    this.fitAddon = new FitAddon();

    this.terminal = new Terminal();

    this.terminal.open(this.terminalDiv.nativeElement);

    this.terminal.loadAddon(new WebglAddon());
    this.terminal.loadAddon(new WebLinksAddon());
    this.terminal.loadAddon(this.fitAddon);

    this.fetchLogs();

    this.handleSize();

    this.socketMessageSubscription = this.socketService.messageObservable.subscribe(data => {
      if (this.readSocketMessages) {
        if (data.type == SocketMessageType.S2C_LogMessage) {
          this.appendLine(data.data.type + "," + data.data.content);
        }
      }
    });

    this.socketEventSubscription = this.socketService.eventObservable.subscribe(event => {
      switch (event) {
        case SocketEventType.CONNECTED:
          this.terminal.writeln(ConsoleColor.PURPLE + "WEB UI: " + ConsoleColor.GREEN + "Socket connected" + ConsoleColor.RESET);
          break;

        //case SocketEventType.CONNECT_ERROR:
        //  this.terminal.writeln(ConsoleColor.PURPLE + "WEB UI: " + ConsoleColor.YELLOW + "Socket got an connection error" + ConsoleColor.RESET);
        //  break;

        case SocketEventType.DISCONNECTED:
          this.terminal.writeln(ConsoleColor.PURPLE + "WEB UI: " + ConsoleColor.RED + "Socket disconnected" + ConsoleColor.RESET);
          break;

        default:
          break;
      }
    });

    this.navbarChangeSubscription = this.navbarService.onChangeObservable.subscribe(_ => {
      this.handleSize();
    });

    this.sessionCheckInterval = setInterval(() => {
      this.checkSession();
    }, 1000 * 5);

    this.checkSession();
  }

  private fetchLogs() {
    this.readSocketMessages = false;
    this.system.getLogs().pipe(catchError(err => {
      this.terminal.writeln(ConsoleColor.RED + "Failed to fetch logs. Check your connection and try again" + ConsoleColor.RESET);
      throw err;
    })).subscribe(data => {
      this.readSocketMessages = true;
      const entries = data.split("\n");
      entries.forEach(entry => {
        this.appendLine(entry);
      });
    });
  }

  private checkSession() {
    this.system.getSessionId().subscribe(sessionId => {
      if (sessionId == null) {
        return;
      }

      if (this.sessionId == null) {
        this.sessionId = sessionId;
        return;
      }

      if (this.sessionId != sessionId) {
        this.sessionId = sessionId;
        this.terminal.clear();
        this.terminal.writeln(ConsoleColor.CYAN + "Session id changed. Fetching new logs...");
        this.fetchLogs();
      }
    });
  }

  private appendLine(log: string) {
    if (log.trim().length == 0) {
      return;
    }

    const split = log.split(",")

    const prefix = split[0];
    const prefixColor = getPrefixColor(prefix);
    if (prefixColor != null) {
      split.shift();
    }

    let logText = "";
    if (prefixColor != null) {
      logText += prefixColor + "(" + prefix.toUpperCase() + ") " + ConsoleColor.RESET;
    }
    logText += split.join(",");

    this.terminal.writeln(logText);
  }

  ngOnDestroy(): void {
    if (this.sessionCheckInterval != null) {
      clearInterval(this.sessionCheckInterval);
    }

    this.socketMessageSubscription?.unsubscribe();
    this.socketEventSubscription?.unsubscribe();
    this.navbarChangeSubscription?.unsubscribe();
    this.terminal.dispose();
  }

  @HostListener('window:resize', ['$event'])
  onResize(_: any) {
    this.handleSize();
  }

  private handleSize() {
    let navbarSize = 0;
    if (this.navbarService.element != null) {
      navbarSize = this.navbarService.element.getBoundingClientRect().height;
    }

    let height = window.innerHeight - navbarSize - 20;
    // pin min size to 400
    if (height < 400) {
      height = 400;
    }
    this.terminalDiv.nativeElement.style.height = height + "px";

    this.fitAddon.fit();
  }
}

function getPrefixColor(prefix: string): any {
  switch (prefix) {
    case "log":
      return ConsoleColor.CYAN;

    case "warning":
      return ConsoleColor.YELLOW;

    case "error":
      return ConsoleColor.RED;
    default:
      return null;
  }
}
