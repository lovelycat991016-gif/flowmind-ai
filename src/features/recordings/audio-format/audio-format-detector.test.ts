import { describe, expect, it } from "vitest";

import { detectAudioFormat } from "./audio-format-detector";
import {
  m4aBytes,
  mp3Bytes,
  wavBytes,
  webmBytes,
} from "./audio-format-test-fixtures";

const unknownFormat = {
  container: "unknown",
  variant: null,
  codec: "unknown",
};

function encodeSynchsafeInteger(value: number) {
  return [
    (value >> 21) & 0x7f,
    (value >> 14) & 0x7f,
    (value >> 7) & 0x7f,
    value & 0x7f,
  ];
}

function concatenate(...parts: Uint8Array[]) {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function createId3v2Header(
  version: 3 | 4,
  flags: number,
  payloadSize: number,
) {
  return new Uint8Array([
    0x49,
    0x44,
    0x33,
    version,
    0,
    flags,
    ...encodeSynchsafeInteger(payloadSize),
  ]);
}

describe("detectAudioFormat", () => {
  it("detects two consecutive MPEG audio frames as MP3", () => {
    expect(detectAudioFormat(mp3Bytes)).toEqual({
      container: "mp3",
      variant: null,
      codec: "mp3",
    });
  });

  it("detects an M4A brand inside an ISO BMFF container without guessing its codec", () => {
    expect(detectAudioFormat(m4aBytes)).toEqual({
      container: "iso_bmff",
      variant: "m4a",
      codec: "unknown",
    });
  });

  it("rejects random bytes with one MPEG-like header at offset 50", () => {
    const bytes = new Uint8Array(128).fill(0x11);
    bytes.set([0xff, 0xfb, 0x90, 0x64], 50);

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("rejects a single complete MPEG audio frame", () => {
    expect(detectAudioFormat(mp3Bytes.slice(0, 417))).toEqual(unknownFormat);
  });

  it("detects valid MP3 frames after ID3v2 metadata larger than 65KB", () => {
    const metadataSize = 70_000;
    const metadata = new Uint8Array(metadataSize).fill(0x33);
    const bytes = concatenate(
      createId3v2Header(4, 0, metadataSize),
      metadata,
      mp3Bytes,
    );

    expect(detectAudioFormat(bytes)).toEqual({
      container: "mp3",
      variant: null,
      codec: "mp3",
    });
  });

  it("rejects a truncated ID3v2 tag", () => {
    const bytes = concatenate(
      createId3v2Header(4, 0, 32),
      new Uint8Array(8),
    );

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("rejects an ID3v2 header truncated inside its size field", () => {
    const bytes = new Uint8Array([
      0x49, 0x44, 0x33, 4, 0, 0,
      0, 0,
    ]);

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("rejects an ID3v2 tag with a non-synchsafe size", () => {
    const bytes = concatenate(
      new Uint8Array([
        0x49, 0x44, 0x33, 4, 0, 0,
        0x80, 0, 0, 0,
      ]),
      mp3Bytes,
    );

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("ignores an MPEG-like header inside ID3v2 metadata", () => {
    const metadata = new Uint8Array(64).fill(0x44);
    metadata.set([0xff, 0xfb, 0x90, 0x64], 20);
    const bytes = concatenate(
      createId3v2Header(4, 0, metadata.length),
      metadata,
    );

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("detects MP3 after a valid ID3v2.3 extended header", () => {
    const extendedHeader = new Uint8Array([
      0, 0, 0, 6,
      0, 0,
      0, 0, 0, 0,
    ]);
    const bytes = concatenate(
      createId3v2Header(3, 0x40, extendedHeader.length),
      extendedHeader,
      mp3Bytes,
    );

    expect(detectAudioFormat(bytes)).toEqual({
      container: "mp3",
      variant: null,
      codec: "mp3",
    });
  });

  it("detects MP3 after a valid ID3v2.4 extended header and footer", () => {
    const extendedHeader = new Uint8Array([0, 0, 0, 6, 1, 0]);
    const header = createId3v2Header(4, 0x50, extendedHeader.length);
    const footer = new Uint8Array([
      0x33,
      0x44,
      0x49,
      ...header.slice(3),
    ]);
    const bytes = concatenate(header, extendedHeader, footer, mp3Bytes);

    expect(detectAudioFormat(bytes)).toEqual({
      container: "mp3",
      variant: null,
      codec: "mp3",
    });
  });

  it("rejects ID3v2.4 when the declared footer is missing", () => {
    const metadata = new Uint8Array(16);
    const bytes = concatenate(
      createId3v2Header(4, 0x10, metadata.length),
      metadata,
      mp3Bytes,
    );

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("rejects an ID3v2.4 extended header that exceeds the tag boundary", () => {
    const malformedExtendedHeader = new Uint8Array([0, 0, 0, 12, 1, 0]);
    const bytes = concatenate(
      createId3v2Header(4, 0x40, malformedExtendedHeader.length),
      malformedExtendedHeader,
      mp3Bytes,
    );

    expect(detectAudioFormat(bytes)).toEqual(unknownFormat);
  });

  it("detects RIFF/WAVE PCM bytes", () => {
    expect(detectAudioFormat(wavBytes)).toEqual({
      container: "wav",
      variant: null,
      codec: "pcm",
    });
  });

  it("detects an EBML WebM document", () => {
    expect(detectAudioFormat(webmBytes)).toEqual({
      container: "webm",
      variant: null,
      codec: "unknown",
    });
  });

  it("does not classify arbitrary bytes from an ArrayBuffer", () => {
    expect(
      detectAudioFormat(new Uint8Array([1, 2, 3, 4, 5]).buffer),
    ).toEqual(unknownFormat);
  });
});
