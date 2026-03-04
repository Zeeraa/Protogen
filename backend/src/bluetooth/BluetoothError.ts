/**
 * Error thrown by BluetoothManager when a bluetoothctl operation fails.
 * Carries an HTTP-appropriate status code so the router can forward it directly.
 */
export class BluetoothError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "BluetoothError";
    this.statusCode = statusCode;
  }
}
