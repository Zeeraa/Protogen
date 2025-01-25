import { Equal } from "typeorm";
import { ApiKey } from "../database/models/apikeys/ApiKey.model";
import { Protogen } from "../Protogen";
import { uuidv7 } from "uuidv7";

export const ApiKeyHeader = "X-API-Key";

export class ApiKeyManager {
  private _protogen;
  private _keys: ApiKey[] = [];

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  public async load() {
    this.protogen.logger.info("ApiKeyManager", "Loading api keys");
    const repo = this.protogen.database.dataSource.getRepository(ApiKey);
    this._keys = await repo.find();
    this.protogen.logger.info("ApiKeyManager", this._keys.length + " api keys loaded");
  }

  public get protogen() {
    return this._protogen;
  }

  public get keys() {
    return this._keys;
  }

  public async createApiKey(name: string, superUser: boolean): Promise<ApiKey | null> {
    const repo = this.protogen.database.dataSource.getRepository(ApiKey);
    const existing = await repo.findOne({
      where: {
        name: Equal(name),
      },
    });

    if (existing != null) {
      return null;
    }

    const newKey = new ApiKey();

    newKey.apiKey = uuidv7();
    newKey.name = name;
    newKey.superUser = superUser;

    const result = await repo.save(newKey);
    this.keys.push(result);
    return result;
  }

  public async deleteKey(key: string): Promise<boolean> {
    const repo = this.protogen.database.dataSource.getRepository(ApiKey);
    const keyObject = await repo.findOne({
      where: {
        apiKey: Equal(key),
      },
    });

    if (keyObject == null) {
      return false;
    }

    await repo.delete(keyObject.apiKey);

    this._keys = this.keys.filter(k => k.apiKey != keyObject.apiKey);

    return true;
  }
}