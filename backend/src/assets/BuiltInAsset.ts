import { z } from "zod";

export interface BuiltInAsset {
  name: string;
  display_name: string;
  type: BuiltInAssetType;
  path: string;
  author?: AssetAuthor;
}

export interface AssetAuthor {
  name: string;
  links?: AuthorLink[];
}

export interface AuthorLink {
  service?: string;
  text: string;
  url: string;
}

export enum BuiltInAssetType {
  VISOR_TEXTURE = "VISOR_TEXTURE",
}

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
