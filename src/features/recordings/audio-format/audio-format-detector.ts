export type DetectedAudioContainer =
  | "mp3"
  | "iso_bmff"
  | "wav"
  | "webm"
  | "unknown";

export type DetectedAudioCodec = "mp3" | "pcm" | "unknown";

export type DetectedAudioFormat = {
  container: DetectedAudioContainer;
  variant: "m4a" | "mp4" | null;
  codec: DetectedAudioCodec;
};

const unknownFormat: DetectedAudioFormat = {
  container: "unknown",
  variant: null,
  codec: "unknown",
};

function asBytes(input: Uint8Array | ArrayBuffer) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function hasBytesAt(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function hasAsciiAt(bytes: Uint8Array, offset: number, expected: string) {
  return [...expected].every(
    (value, index) => bytes[offset + index] === value.charCodeAt(0),
  );
}

const MPEG1_LAYER_III_BITRATES_KBPS = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG2_LAYER_III_BITRATES_KBPS = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];

type MpegAudioFrame = {
  version: number;
  layer: number;
  sampleRate: number;
  length: number;
};

function parseMpegAudioFrame(
  bytes: Uint8Array,
  offset: number,
): MpegAudioFrame | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;

  const second = bytes[offset + 1] ?? 0;
  const third = bytes[offset + 2] ?? 0;
  const version = (second >> 3) & 0b11;
  const layer = (second >> 1) & 0b11;
  const bitrateIndex = (third >> 4) & 0b1111;
  const sampleRateIndex = (third >> 2) & 0b11;

  if (
    bytes[offset] !== 0xff ||
    (second & 0b1110_0000) !== 0b1110_0000 ||
    version === 0b01 ||
    layer !== 0b01 ||
    bitrateIndex === 0 ||
    bitrateIndex === 0b1111 ||
    sampleRateIndex === 0b11
  ) {
    return null;
  }

  const sampleRates =
    version === 0b11
      ? [44_100, 48_000, 32_000]
      : version === 0b10
        ? [22_050, 24_000, 16_000]
        : [11_025, 12_000, 8_000];
  const bitrate =
    (version === 0b11
      ? MPEG1_LAYER_III_BITRATES_KBPS
      : MPEG2_LAYER_III_BITRATES_KBPS)[bitrateIndex] ?? 0;
  const sampleRate = sampleRates[sampleRateIndex] ?? 0;
  const padding = (third >> 1) & 1;
  const coefficient = version === 0b11 ? 144 : 72;
  const length = Math.floor(
    (coefficient * bitrate * 1_000) / sampleRate + padding,
  );

  if (length < 4 || offset + length > bytes.length) return null;

  return { version, layer, sampleRate, length };
}

function readSynchsafeInteger(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > bytes.length) return null;

  const values = [
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  ];
  if (values.some((value) => (value & 0x80) !== 0)) return null;

  return (
    (values[0] << 21) |
    (values[1] << 14) |
    (values[2] << 7) |
    values[3]
  );
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > bytes.length) return null;

  return (
    (bytes[offset] ?? 0) * 0x100_0000 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}

function hasValidId3v23ExtendedHeader(
  bytes: Uint8Array,
  start: number,
  tagEnd: number,
) {
  const size = readUint32BigEndian(bytes, start);
  if (size === null || (size !== 6 && size !== 10)) return false;

  const extendedHeaderEnd = start + 4 + size;
  if (extendedHeaderEnd > tagEnd) return false;

  const firstFlagByte = bytes[start + 4] ?? 0;
  const secondFlagByte = bytes[start + 5] ?? 0;
  const hasCrc = (firstFlagByte & 0x80) !== 0;
  return (
    (firstFlagByte & 0x7f) === 0 &&
    secondFlagByte === 0 &&
    size === (hasCrc ? 10 : 6)
  );
}

function hasValidId3v24ExtendedHeader(
  bytes: Uint8Array,
  start: number,
  tagEnd: number,
) {
  const size = readSynchsafeInteger(bytes, start);
  if (size === null || size < 6 || start + size > tagEnd) return false;
  if (bytes[start + 4] !== 1) return false;

  const flags = bytes[start + 5] ?? 0;
  if ((flags & 0x8f) !== 0) return false;

  let cursor = start + 6;
  const extendedHeaderEnd = start + size;
  const flagDataLengths = [
    { flag: 0x40, length: 0 },
    { flag: 0x20, length: 5 },
    { flag: 0x10, length: 1 },
  ];

  for (const { flag, length } of flagDataLengths) {
    if ((flags & flag) === 0) continue;
    if (cursor >= extendedHeaderEnd || bytes[cursor] !== length) return false;
    cursor += 1 + length;
    if (cursor > extendedHeaderEnd) return false;
  }

  return cursor === extendedHeaderEnd;
}

function id3v2AudioStart(bytes: Uint8Array) {
  if (bytes.length < 10 || !hasAsciiAt(bytes, 0, "ID3")) return null;

  const version = bytes[3] ?? 0;
  const revision = bytes[4] ?? 0;
  const flags = bytes[5] ?? 0;
  const allowedFlags = version === 2 ? 0xc0 : version === 3 ? 0xe0 : 0xf0;
  if (
    (version !== 2 && version !== 3 && version !== 4) ||
    revision === 0xff ||
    (flags & ~allowedFlags) !== 0
  ) {
    return null;
  }

  const tagSize = readSynchsafeInteger(bytes, 6);
  if (tagSize === null) return null;

  const tagStart = 10;
  const tagEnd = tagStart + tagSize;
  if (tagEnd > bytes.length) return null;

  if (
    version === 3 &&
    (flags & 0x40) !== 0 &&
    !hasValidId3v23ExtendedHeader(bytes, tagStart, tagEnd)
  ) {
    return null;
  }
  if (
    version === 4 &&
    (flags & 0x40) !== 0 &&
    !hasValidId3v24ExtendedHeader(bytes, tagStart, tagEnd)
  ) {
    return null;
  }

  if (version !== 4 || (flags & 0x10) === 0) return tagEnd;

  const footerEnd = tagEnd + 10;
  if (
    footerEnd > bytes.length ||
    !hasAsciiAt(bytes, tagEnd, "3DI") ||
    bytes[tagEnd + 3] !== version ||
    bytes[tagEnd + 4] !== revision ||
    bytes[tagEnd + 5] !== flags ||
    readSynchsafeInteger(bytes, tagEnd + 6) !== tagSize
  ) {
    return null;
  }

  return footerEnd;
}

function hasConsecutiveMpegFrames(bytes: Uint8Array, offset: number) {
  const first = parseMpegAudioFrame(bytes, offset);
  if (!first) return false;

  const second = parseMpegAudioFrame(bytes, offset + first.length);
  return (
    second !== null &&
    second.version === first.version &&
    second.layer === first.layer &&
    second.sampleRate === first.sampleRate
  );
}

function isMp3(bytes: Uint8Array) {
  if (!hasAsciiAt(bytes, 0, "ID3")) {
    return hasConsecutiveMpegFrames(bytes, 0);
  }

  const audioStart = id3v2AudioStart(bytes);
  return audioStart !== null && hasConsecutiveMpegFrames(bytes, audioStart);
}

function isoBmffVariant(bytes: Uint8Array) {
  if (bytes.length < 12 || !hasAsciiAt(bytes, 4, "ftyp")) return null;

  const brandLimit = Math.min(bytes.length, 64);
  for (let offset = 8; offset + 3 < brandLimit; offset += 4) {
    if (hasAsciiAt(bytes, offset, "M4A ") || hasAsciiAt(bytes, offset, "M4B ")) {
      return "m4a" as const;
    }
  }
  return "mp4" as const;
}

function wavCodec(bytes: Uint8Array): DetectedAudioCodec {
  const searchLimit = Math.min(bytes.length - 9, 4_096);
  for (let offset = 12; offset <= searchLimit; offset += 1) {
    if (!hasAsciiAt(bytes, offset, "fmt ")) continue;
    const format = (bytes[offset + 8] ?? 0) | ((bytes[offset + 9] ?? 0) << 8);
    return format === 1 || format === 3 ? "pcm" : "unknown";
  }
  return "unknown";
}

function isWebm(bytes: Uint8Array) {
  if (!hasBytesAt(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) return false;

  const searchLimit = Math.min(bytes.length - 3, 4_096);
  for (let offset = 4; offset <= searchLimit; offset += 1) {
    if (hasAsciiAt(bytes, offset, "webm")) return true;
  }
  return false;
}

export function detectAudioFormat(
  input: Uint8Array | ArrayBuffer,
): DetectedAudioFormat {
  const bytes = asBytes(input);

  const variant = isoBmffVariant(bytes);
  if (variant) {
    return { container: "iso_bmff", variant, codec: "unknown" };
  }
  if (
    hasAsciiAt(bytes, 0, "RIFF") &&
    hasAsciiAt(bytes, 8, "WAVE")
  ) {
    return { container: "wav", variant: null, codec: wavCodec(bytes) };
  }
  if (isWebm(bytes)) {
    return { container: "webm", variant: null, codec: "unknown" };
  }
  if (isMp3(bytes)) {
    return { container: "mp3", variant: null, codec: "mp3" };
  }
  return unknownFormat;
}
