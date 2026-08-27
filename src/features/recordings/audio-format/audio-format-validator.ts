import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";

import {
  detectAudioFormat,
  type DetectedAudioContainer,
  type DetectedAudioFormat,
} from "./audio-format-detector";

type AudioFormatValidationFailureCode = Extract<
  TranscriptionFailureCode,
  | "audio_format_mismatch"
  | "audio_format_unsupported"
  | "audio_format_unrecognized"
>;

export class AudioFormatValidationError extends Error {
  constructor(readonly code: AudioFormatValidationFailureCode) {
    super("Unable to validate recording audio format.");
    this.name = "AudioFormatValidationError";
  }
}

type AudioFormatValidation =
  | {
      validation: "accepted";
      detected: DetectedAudioFormat;
    }
  | {
      validation: "mismatch" | "unsupported" | "unrecognized";
      detected: DetectedAudioFormat;
      failureCode: AudioFormatValidationFailureCode;
    };

const declaredContracts: Readonly<
  Record<
    string,
    { container: DetectedAudioContainer; extensions: ReadonlySet<string> }
  >
> = {
  "audio/mpeg": { container: "mp3", extensions: new Set(["mp3"]) },
  "audio/mp4": {
    container: "iso_bmff",
    extensions: new Set(["mp4", "m4a"]),
  },
  "audio/wav": { container: "wav", extensions: new Set(["wav"]) },
  "audio/webm": { container: "webm", extensions: new Set(["webm"]) },
};

function filenameExtension(filename: string) {
  return filename.match(/\.([A-Za-z0-9]{1,16})$/)?.[1]?.toLowerCase() ?? null;
}

export function validateDeclaredAudioFormat(input: {
  bytes: Uint8Array | ArrayBuffer;
  originalFilename: string;
  declaredMimeType: string;
}): AudioFormatValidation {
  const detected = detectAudioFormat(input.bytes);
  if (detected.container === "unknown") {
    return {
      validation: "unrecognized",
      detected,
      failureCode: "audio_format_unrecognized",
    };
  }

  const declared = declaredContracts[input.declaredMimeType];
  if (!declared) {
    return {
      validation: "unsupported",
      detected,
      failureCode: "audio_format_unsupported",
    };
  }

  const extension = filenameExtension(input.originalFilename);
  if (
    detected.container !== declared.container ||
    !extension ||
    !declared.extensions.has(extension)
  ) {
    return {
      validation: "mismatch",
      detected,
      failureCode: "audio_format_mismatch",
    };
  }

  return { validation: "accepted", detected };
}
