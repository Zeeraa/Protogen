import { DosboxManager } from "./DosboxManager";
import { DosboxApplicationType } from "./DosboxApplicationType";

export class DosboxApplication {
  private readonly dosbox: DosboxManager;
  public readonly allowMaintenanceMode: boolean;
  public readonly type: DosboxApplicationType;
  public readonly name: string;
  public readonly mountpoint: string | null;
  public displayName: string;
  public applicationCommandline: string[] = [];

  constructor(dosbox: DosboxManager, type: DosboxApplicationType, name: string, mountpoint: string | null, displayName: string, applicationCommandline: string[], allowMaintenanceMode: boolean) {
    this.dosbox = dosbox;
    this.type = type;
    this.name = name;
    this.mountpoint = mountpoint;
    this.displayName = displayName;
    this.applicationCommandline = applicationCommandline;
    this.allowMaintenanceMode = allowMaintenanceMode;
  }

  /**
   * Generate all the command line arguments for DOSBox
   * @param useCommandline If true include the configured command line arguments for this application. Use false when going into maintenance mode or similar scenarios.
   */
  public generateCommandLine(useCommandline: boolean) {
    // Always mount C:
    const commandline = ["-c", `mount c ${this.dosbox.cDrivePath}`];

    if (this.mountpoint) {
      // Mount D: if mountpoint is set
      commandline.push("-c", `mount d ${this.mountpoint}`);
    }

    if (useCommandline) {
      // Append the configured command line arguments for this application
      commandline.push(...this.applicationCommandline);
    }
    return commandline;
  }
}
