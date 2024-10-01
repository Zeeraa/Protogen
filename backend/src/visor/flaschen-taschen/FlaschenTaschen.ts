import * as dgram from 'dgram';
import sharp from 'sharp';

export class FlaschenTaschen {
  private _host;
  private _port;
  private _socket;

  constructor(host: string, port: number) {
    this._host = host;
    this._port = port;
    this._socket = dgram.createSocket("udp4");
  }

  sendImageBuffer(imageBuffer: Buffer, width: number, height: number, xOffset = 0, yOffset = 0, zLayer = 0) {
    return new Promise<void>(async (resolve, reject) => {
      const ppmHeader = `P6\n${width} ${height}\n#FT: ${xOffset} ${yOffset} ${zLayer}\n255\n`;
      const ppmHeaderBuffer = Buffer.from(ppmHeader, 'ascii');

      const buffer = await sharp(imageBuffer)
        .raw()
        .removeAlpha()
        .toBuffer();

      const ppmBuffer = Buffer.concat([ppmHeaderBuffer, buffer]);

      this._socket.send(ppmBuffer, 0, ppmBuffer.length, this._port, this._host, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  }
}