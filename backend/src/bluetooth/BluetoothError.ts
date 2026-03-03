/**
 * Error thrown by BluetoothManager when a bluetoothctl command fails
 * with a known/parseable reason.
 */
export class BluetoothError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "BluetoothError";
    this.statusCode = statusCode;
  }
}
