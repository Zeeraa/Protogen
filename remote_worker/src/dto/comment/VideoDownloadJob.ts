import { z } from "zod";

export const VideoDownloadJobModel = z.object({
    url: z.string().url().max(1024),
    mirrorVideo: z.boolean(),
    flipVideo: z.boolean(),
});

export type VideoDownloadJobDTO = z.infer<typeof VideoDownloadJobModel>;
