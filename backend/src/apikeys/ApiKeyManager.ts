import { Equal } from "typeorm";
import { ApiKey } from "../database/models/apikeys/ApiKey.model";
import { Protogen } from "../Protogen";
import { uuidv7 } from "uuidv7";

/**
 * Name of the HTTP header that contains the API key.
 */
export const ApiKeyHeader = "x-api-key";

/**
 * Manages API keys for external integrations
 */
export class ApiKeyManager {
  private _protogen;
  private _keys: ApiKey[] = [];

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  /**
   * Loads API keys from the database.
   */
  public async load() {
    this.protogen.logger.info("ApiKeyManager", "Loading api keys");
    const repo = this.protogen.database.dataSource.getRepository(ApiKey);
    this._keys = await repo.find();
    this.protogen.logger.info("ApiKeyManager", this._keys.length + " api keys loaded");
  }

  public get protogen() {
    return this._protogen;
  }

  /**
   * Get all API keys.
   * @returns An array of ApiKey objects.
   */
  public get keys() {
    return this._keys;
  }

  /**
   * Creates a new API key.
   * @param name The name of the API key.
   * @param superUser Whether the API key has super user privileges.
   * @returns The created ApiKey object or null if the key already exists.
   */
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

  /**
   * Deletes an API key.
   * @param key The API key to delete.
   * @returns True if the key was deleted, false if it was not found.
   */
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
