import { DataSource } from "typeorm";
import { cyan } from "colors";
import { Protogen } from "../Protogen";

export class Database {
  private _protogen;
  private _dataSource;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._dataSource = new DataSource({
      type: "mysql",
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      username: this.config.username,
      password: this.config.password,
      logging: this.config.logging,
      synchronize: true,
      migrationsTableName: "protogen_typeorm_migrations",
      entities: []
    });
  }

  public get protogen() {
    return this._protogen;
  }

  private get config() {
    return this.protogen.config.database;
  }

  public get dataSource() {
    return this._dataSource;
  }

  public async init() {
    this.protogen.logger.info("Database", "Initializing");
    await this._dataSource.initialize();
    this.protogen.logger.info("Database", "Init complete");
  }
}