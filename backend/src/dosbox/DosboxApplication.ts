import { DosboxManager } from "./DosboxManager";
import { Protogen } from "../Protogen";
import { DosboxApplicationType } from "./DosboxApplicationType";

export class DosboxApplication {
  private readonly dosbox: DosboxManager;
  private readonly protogen: Protogen;
  public readonly type: DosboxApplicationType;
  public readonly name: string;
  public readonly mountpoint: string | null;
  public displayName: string;
  public applicationCommandline: string[] = [];

  constructor(dosbox: DosboxManager, protogen: Protogen, type: DosboxApplicationType, name: string, mountpoint: string | null, displayName: string, applicationCommandline: string[]) {
    this.dosbox = dosbox;
    this.protogen = protogen;
    this.name = name;
    this.mountpoint = mountpoint;
    this.displayName = displayName;
    this.applicationCommandline = applicationCommandline;
  }

  /**
   * Generate all the command line arguments for DOSBox
   * @param useCommandline If true include the configured command line arguments for this application. Use false when going into maintenance mode or similar scenarios.
   */
  public generateCommandLine(useCommandline: boolean) {
    const commandline = [];
    // Always mount C:
    commandline.push("mount", "c", this.dosbox.cDrivePath);


    if (this.mountpoint) {
      // Mount D: if mountpoint is set
      commandline.push("mount", "d", this.mountpoint);
    }

    if (useCommandline) {
      // Append the configured command line arguments for this application
      commandline.push(...this.applicationCommandline);
    }
    return commandline;
  }
}