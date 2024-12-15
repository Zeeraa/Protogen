import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { SocketMessage } from './data/SocketMessage';
import { SocketMessageType } from './data/SocketMessageType';
import { Subject } from 'rxjs';
import { SocketEventType } from './data/SocketEventType';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private _socket: Socket | null = null;
  private _connected = false;
  private _disconnectedTimer = 15;
  private _messageSubject = new Subject<SocketMessage>();
  private _eventSubject = new Subject<SocketEventType>();

  constructor() { }

  init() {
    this.connect();

    setInterval(() => {
      if (this._connected) {
        if (this._disconnectedTimer > 0) {
          this._disconnectedTimer--;
        } else {
          this._connected = false;
          console.warn("No ping received for a while. Marking socket as dead for now");
        }
      }
    }, 1000)
  }

  connect() {
    console.log("SocketService::connect()");
    if (this._socket != null) {
      console.debug("Existing socket variable found");
      this.disconnect();
    }
    console.log("Starting new socket connection");
    this._socket = io({
      reconnection: true,
      path: "/protogen-websocket.io"
    });

    this._socket.on('connect', () => {
      console.log('Socket connected');
      this._disconnectedTimer = 15
      this._connected = true;
      this._eventSubject.next(SocketEventType.CONNECTED);
    });

    this._socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this._eventSubject.next(SocketEventType.CONNECT_ERROR);
    });

    this._socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      this._connected = false;
      this._eventSubject.next(SocketEventType.DISCONNECTED);
    });

    this._socket.on('message', (msg: SocketMessage) => {
      this.handleReceivedData(msg);
    });
  }

  get messageObservable() {
    return this._messageSubject.asObservable();
  }

  get eventObservable() {
    return this._eventSubject.asObservable();
  }

  disconnect() {
    if (this._socket != null) {
      console.log("Disconnecting socket");
      this._socket.disconnect();
      this._socket = null;
    }
  }

  get connected() {
    return this._connected;
  }

  public sendMessage(type: SocketMessageType, data: any) {
    if (this._socket == null) {
      return false;
    }

    const message: SocketMessage = {
      type: type,
      data: data,
    }
    this._socket.emit("message", message);
    return true;
  }

  private handleReceivedData(message: SocketMessage) {
    if (message.type == null) {
      console.error("Received socket message without type. ", message);
      return;
    }

    const type = message.type;

    if (type == SocketMessageType.S2C_Ping) {
      this._connected = true;
      this._disconnectedTimer = 15;
    } else if (type == SocketMessageType.S2C_RgbPreview) {
      //console.log("The current led value is ", message.data.leds);
    }

    this._messageSubject.next(message);
  }
}
