import { exec } from "child_process";

/**
 * Set system volume on Raspberry Pi using amixer command
 * @param level - Volume level as a percentage (0-100)
 * @returns Promise<void>
 */
export function setVolume(level: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (level < 0 || level > 100) {
      return reject(new Error('Volume level must be between 0 and 100'));
    }

    const command = `amixer set Master ${level}%`;

    exec(command, (error, _stdout, stderr) => {
      if (error) {
        return reject(`Error setting volume: ${stderr}`);
      }
      resolve();
    });
  });
}

/**
 * Get current system volume on Raspberry Pi using amixer command
 * @returns Promise<number> - The current volume level as a percentage
 */
export function getVolume(): Promise<number> {
  return new Promise((resolve, reject) => {
    const command = `amixer get Master`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error getting volume: ${stderr}`);
      }

      // Extract the volume percentage from stdout
      const matches = stdout.match(/(\d+)%/);

      if (matches && matches[1]) {
        const volume = parseInt(matches[1], 10);
        resolve(volume);
      } else {
        reject(new Error('Could not parse volume level'));
      }
    });
  });
}