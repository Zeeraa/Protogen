import { Subject } from "rxjs";
import { io, Socket } from "socket.io-client";

export class AppSocketConnection {
  private _socket: Socket | null = null;
  private _token;
  private _connected = false;
  private _disconnected = false;

  private _connectedSubject = new Subject<void>();
  private _messageSubject = new Subject<AppSocketPacket<any>>();

  constructor(token: string) {
    this._token = token;
  }

  private get socketHeaders() {
    return {
      Authorization: "Bearer " + String(this._token),
    }
  }

  public get connectedObservable() {
    return this._connectedSubject.asObservable();
  }

  public get messageObservable() {
    return this._messageSubject.asObservable();
  }

  public destroy() {
    if (this._socket != null) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  public connect() {
    if (this.socket != null) {
      this.socket.disconnect();
      this._socket = null;
    }

    this._disconnected = false;

    this._socket = io({
      reconnection: true,
      path: "/protogen-app-websocket.io",
      extraHeaders: this.socketHeaders,
    });

    this._socket.on('connect', () => {
      console.log('Socket connected (App)');
      this._connectedSubject.next();
      this._connected = true;
    });

    this._socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this._disconnected = true;
      this._connected = false;
    });

    this._socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      this._disconnected = true;
      this._connected = false;
    });

    this._socket.on('message', (msg: any) => {
      console.debug('Socket message received:', msg);
      this._messageSubject.next(msg);
    });

    this._socket.on('reconnect_attempt', () => {
      if (this._socket != null) {
        this._socket.io.opts.extraHeaders = this.socketHeaders;
      }
    });
  }

  public sendMessage<T>(msg: AppSocketPacket<T>) {
    if (this._socket != null) {
      this._socket.emit('message', msg);
    }
  }

  public get connected() {
    return this._connected;
  }

  public get socket() {
    return this._socket;
  }

  public get disconnected() {
    return this._disconnected;
  }
}

export interface AppSocketPacket<T> {
  type: string;
  data: T;
}
