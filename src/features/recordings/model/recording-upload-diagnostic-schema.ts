import { z } from "zod";

export const recordingUploadFailureSchema = z.object({
  errorCategory: z.enum([
    "network",
    "http_401",
    "http_403",
    "http_404",
    "http_409",
    "http_413",
    "other_http",
  ]),
  errorCode: z.string().regex(/^\d{3}$/).optional(),
});
