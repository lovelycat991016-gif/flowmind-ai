import { describe, expect, it } from "vitest";

import { validateDeclaredAudioFormat } from "./audio-format-validator";
import {
  m4aBytes,
  mp3Bytes,
  wavBytes,
  webmBytes,
} from "./audio-format-test-fixtures";

describe("validateDeclaredAudioFormat", () => {
  it("accepts MP3 bytes declared as an MP3 recording", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: mp3Bytes,
        originalFilename: "meeting.mp3",
        declaredMimeType: "audio/mpeg",
      }),
    ).toEqual({
      validation: "accepted",
      detected: { container: "mp3", variant: null, codec: "mp3" },
    });
  });

  it("rejects the production-style M4A body declared as MP3", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: m4aBytes,
        originalFilename: "王村小学.mp3",
        declaredMimeType: "audio/mpeg",
      }),
    ).toEqual({
      validation: "mismatch",
      detected: {
        container: "iso_bmff",
        variant: "m4a",
        codec: "unknown",
      },
      failureCode: "audio_format_mismatch",
    });
  });

  it("detects M4A bytes correctly when declared as audio/mp4", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: m4aBytes,
        originalFilename: "meeting.m4a",
        declaredMimeType: "audio/mp4",
      }),
    ).toEqual({
      validation: "accepted",
      detected: {
        container: "iso_bmff",
        variant: "m4a",
        codec: "unknown",
      },
    });
  });

  it("accepts WAV bytes declared as WAV", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: wavBytes,
        originalFilename: "meeting.wav",
        declaredMimeType: "audio/wav",
      }).validation,
    ).toBe("accepted");
  });

  it("accepts WebM bytes declared as WebM", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: webmBytes,
        originalFilename: "meeting.webm",
        declaredMimeType: "audio/webm",
      }).detected.container,
    ).toBe("webm");
  });

  it("rejects unknown bytes as unrecognized", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: new Uint8Array([1, 2, 3, 4]),
        originalFilename: "meeting.mp3",
        declaredMimeType: "audio/mpeg",
      }),
    ).toMatchObject({
      validation: "unrecognized",
      failureCode: "audio_format_unrecognized",
      detected: { container: "unknown" },
    });
  });

  it("rejects a filename extension that conflicts with detected bytes", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: m4aBytes,
        originalFilename: "meeting.mp3",
        declaredMimeType: "audio/mp4",
      }),
    ).toMatchObject({
      validation: "mismatch",
      failureCode: "audio_format_mismatch",
    });
  });

  it("keeps detection unchanged when only the filename changes", () => {
    const first = validateDeclaredAudioFormat({
      bytes: m4aBytes,
      originalFilename: "meeting.m4a",
      declaredMimeType: "audio/mp4",
    });
    const second = validateDeclaredAudioFormat({
      bytes: m4aBytes,
      originalFilename: "meeting.mp3",
      declaredMimeType: "audio/mp4",
    });

    expect(first.detected).toEqual(second.detected);
  });

  it("keeps detection unchanged when only the MIME changes", () => {
    const first = validateDeclaredAudioFormat({
      bytes: m4aBytes,
      originalFilename: "meeting.m4a",
      declaredMimeType: "audio/mp4",
    });
    const second = validateDeclaredAudioFormat({
      bytes: m4aBytes,
      originalFilename: "meeting.m4a",
      declaredMimeType: "audio/mpeg",
    });

    expect(first.detected).toEqual(second.detected);
  });

  it("rejects a declared MIME outside the existing support contract", () => {
    expect(
      validateDeclaredAudioFormat({
        bytes: m4aBytes,
        originalFilename: "meeting.aac",
        declaredMimeType: "audio/aac",
      }),
    ).toMatchObject({
      validation: "unsupported",
      failureCode: "audio_format_unsupported",
    });
  });
});
