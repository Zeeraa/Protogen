import { io, Socket } from "socket.io-client";

export class AppSocketConnection {
  private _socket: Socket | null = null;
  private _token;
  private _connected = false;

  constructor(token: string) {
    this._token = token;
  }

  private get socketHeaders() {
    return {
      Authorization: "Bearer " + String(this._token),
    }
  }

  destroy() {
    if (this._socket != null) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  connect() {
    if (this.socket != null) {
      this.socket.disconnect();
      this._socket = null;
    }

    this._socket = io({
      reconnection: true,
      path: "/protogen-app-websocket.io",
      extraHeaders: this.socketHeaders,
    });

    this._socket.on('connect', () => {
      console.log('Socket connected');
      this._connected = true;
    });

    this._socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this._socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      this._connected = false;
    });

    this._socket.on('message', (msg: any) => {
      console.log(msg);
    });

    this._socket.on('reconnect_attempt', () => {
      if (this._socket != null) {
        this._socket.io.opts.extraHeaders = this.socketHeaders;
      }
    });
  }

  get connected() {
    return this._connected;
  }

  get socket() {
    return this._socket;
  }
}
