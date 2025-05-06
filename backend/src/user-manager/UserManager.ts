import { Equal, Raw } from "typeorm";
import { JwtKeyLength, Protogen } from "../Protogen";
import * as argon2 from "argon2";
import { generateSecretKey, typeAssert } from "../utils/Utils";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { format } from "date-fns";
import jwt from 'jsonwebtoken';
import { User } from "../database/models/auth/User.model";
import { PasswordlessSignInRequest } from "../database/models/auth/PasswordlessSignInRequest.model";

const ERR_NO_KEY = "JWT Key has not yet been configured";

export class UserManager {
  private _protogen;
  private _key: string | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  public get protogen() {
    return this._protogen;
  }

  private get repo() {
    return this.protogen.database.dataSource.getRepository(User);
  }

  public async init() {
    const users = await this.repo.find();
    if (users.length == 0) {
      this.protogen.logger.info("UserManager", "No users found. Setting up default admin account...");
      await this.createUser("admin", "admin", true);
    } else {
      this.protogen.logger.info("UserManager", users.length + " users configured");
    }

    const keyFile = this.protogen.config.dataDirectory + "/jwt-secret.key";
    if (existsSync(keyFile)) {
      this.protogen.logger.info("UserManager", "Reading JWT key");
      this._key = readFileSync(keyFile).toString();
    } else {
      this.protogen.logger.info("UserManager", "Could not find JWT key. Generating a random one");
      this._key = generateSecretKey(JwtKeyLength);
      writeFileSync(keyFile, this._key);
    }

    await this.runCleanup();

    setInterval(() => {
      this.runCleanup();
    }, 1000 * 60); // Every minute
  }

  public async runCleanup() {
    // Remove unused passwordless signin requests
    const passwordlessSigninRepo = this.protogen.database.dataSource.getRepository(PasswordlessSignInRequest);
    const passwordlessSigninRequests = await passwordlessSigninRepo.find();
    const now = new Date();
    const expired = passwordlessSigninRequests.filter((req) => req.expiresAt < now);
    if (expired.length > 0) {
      await passwordlessSigninRepo.remove(expired);
    }
  }

  public async getUserById(id: number) {
    const user = await this.repo.findOne({
      where: {
        id: Equal(id),
      }
    });

    return user;
  }

  public async getAllUsers() {
    return await this.repo.find();
  }

  public async getUserByName(username: string) {
    const user = await this.repo.findOne({
      where: {
        username: Raw((n) => `LOWER(${n}) = LOWER(:username)`, { username })
      }
    });

    return user;
  }

  public async deleteUser(id: number) {
    const result = await this.repo.delete(id);
    return result.affected as number;
  }

  public async changePassword(id: number, password: string): Promise<User | null> {
    const user = await this.getUserById(id);

    if (user == null) {
      return null;
    }

    user.password = await this.hashPassword(password);
    user.lasPasswordChange = new Date();

    const result = await this.repo.save(user);
    return result;
  }

  public async createUser(username: string, password: string, superUser: boolean): Promise<User | null> {
    const existing = await this.getUserByName(username);
    if (existing) {
      return null;
    }

    const user = new User()

    user.username = username;
    user.password = await this.hashPassword(password);
    user.lasPasswordChange = new Date();
    user.superUser = superUser;

    const created = await this.repo.save(user);
    return created;
  }

  public async validatePasswordHash(hash: string, password: string) {
    return await argon2.verify(hash, password);
  }

  public async hashPassword(password: string) {
    return await argon2.hash(password);
  }

  public generateToken(user: User) {
    if (this._key == null) {
      throw new Error(ERR_NO_KEY);
    }

    const payload: ProtogenJWTPayload = {
      isSuperUser: user.superUser,
      userId: user.id,
      passwordChangeDate: passwordChangeDateToStr(user.lasPasswordChange),
      username: user.username,
    }

    const token = jwt.sign(payload, this._key, { expiresIn: "7d" });

    return token;
  }

  public async validateJWTToken(token: string): Promise<User | null> {
    if (this._key == null) {
      throw new Error(ERR_NO_KEY);
    }

    let payload: ProtogenJWTPayload;
    try {
      payload = typeAssert<ProtogenJWTPayload>(jwt.verify(token, this._key));
    } catch (_err) {
      console.log("JWT verify failed");
      return null;
    }

    const user = await this.getUserById(payload.userId);

    if (user == null) {
      console.log("Rejecting JWT due to missing user id");
      return null;
    }

    if (passwordChangeDateToStr(user.lasPasswordChange) != payload.passwordChangeDate) {
      console.log("Rejecting JWT due to password change");
      return null;
    }

    return user;
  }
}

function passwordChangeDateToStr(date: Date) {
  return format(date, "yyyy-MM-dd HH:mm:ss")
}

export interface ProtogenJWTPayload {
  userId: number;
  passwordChangeDate: string;
  isSuperUser: boolean;
  username: string;
}
