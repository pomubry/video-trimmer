import path from "node:path"
import {vi, describe, test, beforeEach, expect} from "vitest";

import {
    createFFmpegScripts,
    getVideoSegmentRegExp,
    sexagesimalToSeconds,
    timestampRegex,
    videoCounter
} from "./formatter.js";
import {FFMPEG_OPTIONS, FILENAME_OPTIONS} from "../config.js";

import type {FFmpegArguments} from "../types/index.js";

beforeEach(() => {
    vi.restoreAllMocks();
})

describe("Timestamp Format", () => {
    test("Properly identify formatted timestamp", () => {
        const ts = timestampRegex.test("12:34:56.123456789 12:34:56.123456789")
        expect(ts).toBe(true);
    })

    test("Accept timestamp with 3 decimal place", () => {
        const ts = timestampRegex.test("12:34:56.123 12:34:56.123456789")
        expect(ts).toBe(true);
    })

    test("Decline timestamp with 2 or less decimal place", () => {
        const ts = timestampRegex.test("12:34:56.123456789 12:34:56.12")
        expect(ts).toBe(false);
    })

    test("Decline timestamp with 10 or more decimal place", () => {
        const ts = timestampRegex.test("12:34:56.1234567891 12:34:56.123456789")
        expect(ts).toBe(false);
    })

    test("Decline timestamp with invalid characters from each end", () => {
        const ts = timestampRegex.test("a12:34:56.1234567891 12:34:56.123456789 b")
        expect(ts).toBe(false);
    })

    test("Decline timestamp with newline", () => {
        const ts = timestampRegex.test("\n12:34:56.123456789 12:34:56.123456789\n")
        expect(ts).toBe(false);
    })

    test("Decline timestamp with tab separator", () => {
        const ts = timestampRegex.test("12:34:56.123456789\t12:34:56.123456789")
        expect(ts).toBe(false);
    })

    test("Decline timestamp with double space", () => {
        const ts = timestampRegex.test("12:34:56.123456789  12:34:56.123456789")
        expect(ts).toBe(false);
    })

    test("Decline timestamp with special char for whitespace", () => {
        const ts = timestampRegex.test("12:34:56.123456789\s12:34:56.123456789")
        expect(ts).toBe(false);
    })
})

describe("Sexagesimal to Seconds Conversion", () => {
    test("Invalid sexagesimal input should throw an error", () => {
        const msgRegex = /invalid sexagesimal/i;

        expect(() => sexagesimalToSeconds("12:34:56.12")).toThrowError(msgRegex)
        expect(() => sexagesimalToSeconds("12:34:56.1234567891")).toThrowError(msgRegex)
        expect(() => sexagesimalToSeconds("invalid input")).toThrowError(msgRegex);
    })

    test("Valid input should return a number in seconds", () => {
        const second1 = sexagesimalToSeconds("12:34:56.123456789")
        const second2 = sexagesimalToSeconds("12:34:56.123")

        expect(second1).toBe(45296.123456789)
        expect(second2).toBe(45296.123)
    })
})

describe("Video Counter", () => {
    test("Prepend 00 to the counter with numbers less than 10", () => {
        expect(videoCounter(1)).toBe("001")
        expect(videoCounter(9)).toBe("009")
    })

    test("Prepend 0 to the counter with numbers less than 100", () => {
        expect(videoCounter(10)).toBe("010")
        expect(videoCounter(99)).toBe("099")
    })

    test("Prepend nothing to the counter with numbers less than 1000", () => {
        expect(videoCounter(100)).toBe("100")
        expect(videoCounter(999)).toBe("999")
    })
})

describe("Generated FFmpeg Scripts", () => {
    const input = "input.mp4";
    const basename = path.parse(input).name;

    test("Should be valid with valid input", () => {
        const obj: FFmpegArguments = {
            input,
            timestampPairs: [["00:00:00.000", "00:01:00.000"], ["00:02:00.000", "00:03:00.000"], ["00:04:00.000", "00:05:00.000"]],
            videoSegments: []
        }

        const ffmpegScripts = [
            `ffmpeg -v warning -stats -ss 00:00:00.000 -to 00:01:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_001.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:02:00.000 -to 00:03:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_002.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:04:00.000 -to 00:05:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_003.mp4`)}"`
        ]

        expect(createFFmpegScripts(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts)
    })

    test("Skip segments that are already created", () => {
        const obj: FFmpegArguments = {
            input,
            timestampPairs: [["00:00:00.000", "00:01:00.000"], ["00:02:00.000", "00:03:00.000"], ["00:04:00.000", "00:05:00.000"]],
            videoSegments: [`${basename}_002.${FILENAME_OPTIONS.EXTENSION_NAME}`]
        }

        const ffmpegScripts = [
            `ffmpeg -v warning -stats -ss 00:00:00.000 -to 00:01:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_001.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:04:00.000 -to 00:05:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_003.mp4`)}"`
        ]

        expect(createFFmpegScripts(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts)
    })

    test("Should apply hevc encoding if set in config", () => {
        const obj: FFmpegArguments = {
            input,
            timestampPairs: [["00:00:00.000", "00:01:00.000"], ["00:02:00.000", "00:03:00.000"], ["00:04:00.000", "00:05:00.000"]],
            videoSegments: []
        }

        const ffmpegScripts = [
            `ffmpeg -v warning -stats -ss 00:00:00.000 -to 00:01:00.000 -i "input.mp4" -crf 23 -c:v hevc "${path.join(basename, `${basename}_001.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:02:00.000 -to 00:03:00.000 -i "input.mp4" -crf 23 -c:v hevc "${path.join(basename, `${basename}_002.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:04:00.000 -to 00:05:00.000 -i "input.mp4" -crf 23 -c:v hevc "${path.join(basename, `${basename}_003.mp4`)}"`
        ]

        vi.spyOn(FFMPEG_OPTIONS, "HEVC", "get").mockReturnValueOnce(true);
        expect(createFFmpegScripts(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts)
    })

    test("Should apply framerate set in config", () => {
        const obj: FFmpegArguments = {
            input,
            timestampPairs: [["00:00:00.000", "00:01:00.000"], ["00:02:00.000", "00:03:00.000"], ["00:04:00.000", "00:05:00.000"]],
            videoSegments: []
        }

        const ffmpegScripts = [
            `ffmpeg -v warning -stats -ss 00:00:00.000 -to 00:01:00.000 -i "input.mp4" -crf 18 -c:v h264 -r 60 "${path.join(basename, `${basename}_001.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:02:00.000 -to 00:03:00.000 -i "input.mp4" -crf 18 -c:v h264 -r 60 "${path.join(basename, `${basename}_002.mp4`)}"`,
            `ffmpeg -v warning -stats -ss 00:04:00.000 -to 00:05:00.000 -i "input.mp4" -crf 18 -c:v h264 -r 60 "${path.join(basename, `${basename}_003.mp4`)}"`
        ]

        vi.spyOn(FFMPEG_OPTIONS, "FPS", "get").mockReturnValueOnce(60);
        expect(createFFmpegScripts(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts)
    })

    test("Should apply the extension set in config", () => {
        const obj: FFmpegArguments = {
            input,
            timestampPairs: [["00:00:00.000", "00:01:00.000"], ["00:02:00.000", "00:03:00.000"], ["00:04:00.000", "00:05:00.000"]],
            videoSegments: []
        }

        const ffmpegScripts = [
            `ffmpeg -v warning -stats -ss 00:00:00.000 -to 00:01:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_001.mkv`)}"`,
            `ffmpeg -v warning -stats -ss 00:02:00.000 -to 00:03:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_002.mkv`)}"`,
            `ffmpeg -v warning -stats -ss 00:04:00.000 -to 00:05:00.000 -i "input.mp4" -crf 18 -c:v h264 "${path.join(basename, `${basename}_003.mkv`)}"`
        ]

        vi.spyOn(FILENAME_OPTIONS, "EXTENSION_NAME", "get").mockReturnValue("mkv");
        expect(createFFmpegScripts(obj, FFMPEG_OPTIONS)).toEqual(ffmpegScripts)

        vi.restoreAllMocks()
        expect(FILENAME_OPTIONS.EXTENSION_NAME).toBe("mp4")
    })
})

describe("Video Segment Regexp", () => {
    const input = "input";
    const {EXTENSION_NAME} = FILENAME_OPTIONS
    const regexp = getVideoSegmentRegExp(input, EXTENSION_NAME);

    test("Return true for valid filenames", () => {
        expect(regexp.test(`${input}_001.${EXTENSION_NAME}`)).toBe(true);
    })

    test("Return false for invalid filenames", () => {
        expect(regexp.test("someOtherFile.ts")).toBe(false);
    })
})
