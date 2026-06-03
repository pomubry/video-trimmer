import path from "node:path";
import { vi, describe, test, beforeEach, expect } from "vitest";

import {
  createFfmpegArgs,
  getVideoSegmentRegExp,
  outputFilenameFormatter,
  removeIndent,
  videoCounter,
} from "./formatter.js";
import { FFMPEG_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import type { FFmpegArguments } from "../types/index.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("videoCounter", () => {
  test("Prepend 00 to the counter with numbers less than 10", () => {
    expect(videoCounter(1)).toBe("001");
    expect(videoCounter(9)).toBe("009");
  });

  test("Prepend 0 to the counter with numbers less than 100", () => {
    expect(videoCounter(10)).toBe("010");
    expect(videoCounter(99)).toBe("099");
  });

  test("Prepend nothing to the counter with numbers less than 1000", () => {
    expect(videoCounter(100)).toBe("100");
    expect(videoCounter(999)).toBe("999");
  });
});

describe("createFFmpegScripts", () => {
  const input = "input.mp4";
  const basename = path.parse(input).name;

  test("Should be valid with valid input", () => {
    const obj: FFmpegArguments = {
      input,
      timestampPairs: [
        ["00:00:00.000", "00:01:00.000"],
        ["00:02:00.000", "00:03:00.000"],
        ["00:04:00.000", "00:05:00.000"],
      ],
      videoSegments: [],
    };

    const ffmpegScripts = obj.timestampPairs.map((pair, idx) => {
      return [
        "-v",
        "warning",
        "-nostats",
        "-ss",
        pair[0],
        "-to",
        pair[1],
        "-i",
        input,
        "-crf",
        "18",
        "-c:v",
        "h264",
        path.join(basename, `${basename}_${videoCounter(idx + 1)}.mp4`),
      ];
    });

    expect(createFfmpegArgs(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts);
  });

  test("Skip segments that are already created", () => {
    const obj: FFmpegArguments = {
      input,
      timestampPairs: [
        ["00:00:00.000", "00:01:00.000"],
        ["00:02:00.000", "00:03:00.000"],
        ["00:04:00.000", "00:05:00.000"],
      ],
      videoSegments: [`${basename}_002.${FILENAME_OPTIONS.EXTENSION_NAME}`],
    };

    const ffmpegScripts = obj.timestampPairs.map((pair, idx) => {
      if (idx === 1) return [];
      return [
        "-v",
        "warning",
        "-nostats",
        "-ss",
        pair[0],
        "-to",
        pair[1],
        "-i",
        input,
        "-crf",
        "18",
        "-c:v",
        "h264",
        path.join(basename, `${basename}_${videoCounter(idx + 1)}.mp4`),
      ];
    });

    expect(createFfmpegArgs(obj, FFMPEG_OPTIONS)).toEqual(
      ffmpegScripts.filter((scr) => scr.length > 0),
    );
  });

  test("Should apply hevc encoding if set in config", () => {
    const obj: FFmpegArguments = {
      input,
      timestampPairs: [
        ["00:00:00.000", "00:01:00.000"],
        ["00:02:00.000", "00:03:00.000"],
        ["00:04:00.000", "00:05:00.000"],
      ],
      videoSegments: [],
    };

    const ffmpegScripts = obj.timestampPairs.map((pair, idx) => {
      return [
        "-v",
        "warning",
        "-nostats",
        "-ss",
        pair[0],
        "-to",
        pair[1],
        "-i",
        input,
        "-x265-params",
        "log-level=error",
        "-crf",
        "23",
        "-c:v",
        "hevc",
        "-tag:v",
        "hvc1",
        path.join(basename, `${basename}_${videoCounter(idx + 1)}.mp4`),
      ];
    });

    vi.spyOn(FFMPEG_OPTIONS, "HEVC", "get").mockReturnValueOnce(true);
    expect(createFfmpegArgs(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts);
  });

  test("Should apply framerate set in config", () => {
    const obj: FFmpegArguments = {
      input,
      timestampPairs: [
        ["00:00:00.000", "00:01:00.000"],
        ["00:02:00.000", "00:03:00.000"],
        ["00:04:00.000", "00:05:00.000"],
      ],
      videoSegments: [],
    };

    const ffmpegScripts = obj.timestampPairs.map((pair, idx) => {
      return [
        "-v",
        "warning",
        "-nostats",
        "-ss",
        pair[0],
        "-to",
        pair[1],
        "-i",
        input,
        "-crf",
        "18",
        "-c:v",
        "h264",
        "-r",
        "60",
        path.join(basename, `${basename}_${videoCounter(idx + 1)}.mp4`),
      ];
    });

    vi.spyOn(FFMPEG_OPTIONS, "FPS", "get").mockReturnValueOnce(60);
    expect(createFfmpegArgs(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts);
  });

  test("Should apply the extension set in config", () => {
    const obj: FFmpegArguments = {
      input,
      timestampPairs: [
        ["00:00:00.000", "00:01:00.000"],
        ["00:02:00.000", "00:03:00.000"],
        ["00:04:00.000", "00:05:00.000"],
      ],
      videoSegments: [],
    };

    const ffmpegScripts = obj.timestampPairs.map((pair, idx) => {
      return [
        "-v",
        "warning",
        "-nostats",
        "-ss",
        pair[0],
        "-to",
        pair[1],
        "-i",
        input,
        "-crf",
        "18",
        "-c:v",
        "h264",
        path.join(basename, `${basename}_${videoCounter(idx + 1)}.mkv`),
      ];
    });

    vi.spyOn(FILENAME_OPTIONS, "EXTENSION_NAME", "get").mockReturnValue("mkv");
    expect(createFfmpegArgs(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts);

    vi.restoreAllMocks();
    expect(FILENAME_OPTIONS.EXTENSION_NAME).toBe("mp4");
  });
});

describe("Video Segment Regexp", () => {
  const input = "input";
  const { EXTENSION_NAME } = FILENAME_OPTIONS;
  const regexp = getVideoSegmentRegExp(input, EXTENSION_NAME);

  test("Return true for valid filenames", () => {
    expect(regexp.test(`${input}_001.${EXTENSION_NAME}`)).toBe(true);
  });

  test("Return false for invalid filenames", () => {
    expect(regexp.test("someOtherFile.ts")).toBe(false);
  });
});

describe("outputFilenameFormatter", () => {
  test("Should return correct filename format", () => {
    const input = "input";
    const expectedFilename = `input (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;

    expect(outputFilenameFormatter(input)).toBe(expectedFilename);
  });
});

describe("removeIndent", () => {
  test("Should remove indentation from a string", () => {
    const input = `
        [input]:
            - Message 1
            - Message 2`;
    const expectedOutput = `
[input]:
    - Message 1
    - Message 2`;

    const res = removeIndent(input);

    expect(res).toBe(expectedOutput);
  });

  test("Should return the same string", () => {
    const input = `String without indentation`;

    const res = removeIndent(input);

    expect(res).toBe(input);
  });
});
