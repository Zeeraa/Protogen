import { z } from "zod";

/**
 * Represents a built-in asset in the system.
 */
export interface BuiltInAsset {
  name: string;
  display_name: string;
  type: BuiltInAssetType;
  path: string;
  author?: AssetAuthor;
}

/**
 * Specifies the author of a built-in asset.
 */
export interface AssetAuthor {
  name: string;
  links?: AuthorLink[];
}

/**
 * Link to an author's profile or website.
 */
export interface AuthorLink {
  service?: string;
  text: string;
  url: string;
}

/**
 * Enum representing the types of built-in assets.
 */
export enum BuiltInAssetType {
  VISOR_TEXTURE = "VISOR_TEXTURE",
}

/**
 * Zod schema for validating the data file.
 */
export const BuiltInAssetSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, {
    message: "String must be lowercase, alphanumeric, and can include underscores only.",
  }),
  group: z.string().min(1),
  display_name: z.string(),
  type: z.nativeEnum(BuiltInAssetType),
  path: z.string(),
  author: z.object({
    name: z.string(),
    links: z.array(z.object({
      service: z.string().optional(),
      text: z.string(),
      url: z.string().url(),
    })).optional(),
  }).optional(),
});
