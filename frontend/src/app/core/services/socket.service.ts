import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private _socket: Socket | null = null;

  constructor() { }

  init() {
    this.connect();
  }

  connect() {
    console.log("SocketService::connect()");
    if (this._socket != null) {
      console.debug("Existing socket variable found");
      this.disconnect();
    }
    console.log("Starting new socket connection");
    this._socket = io({
      reconnection: true
    });
  }

  disconnect() {
    if (this._socket != null) {
      console.log("Disconnecting socket");
      this._socket.disconnect();
      this._socket = null;
    }
  }
}
