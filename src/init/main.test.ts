import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {fs} from "memfs";

import * as fileSystem from "../repositories/filesystem.js";
import * as validator from "../utils/validator.js";
import {main} from "./main.js";
import {readTimestamps} from "../repositories/filesystem.js";
import {outputFilenameFormatter, sexagesimalFormat, videoCounter} from "../utils/formatter.js";
import {getTimestampArray} from "../utils/timestamp.js";

import {APP_OPTIONS, FILENAME_OPTIONS} from "../config.js";

import type {MainArgs} from "../types/index.js";

const baseName = "segment"
const timestampText = `${baseName}.${FILENAME_OPTIONS.EXTENSION_NAME}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`
const videoSegments = new Array(5)
    .fill(0)
    .map((_, i) => `${baseName}_${videoCounter(i + 1)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)
const errorFile = videoSegments.filter((_, i) => i % 2 === 0)
const argsInit: MainArgs = {
    timestamp: timestampText,
    timestampPairs: [[]],
    totalTime: 0,
    videoFilename: "",
    videoSegmentDurations: []
}

describe("main function", () => {
    let args = {...argsInit};
    const otherFile = "other-file.txt"
    const spy = vi.fn();

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(vi.fn())
        vi.spyOn(console, "error").mockImplementation(vi.fn())
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue([]);
        vi.spyOn(fileSystem, "getFileSize")
            .mockReturnValueOnce(50000)
            .mockReturnValueOnce(10000)

        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampText, {encoding: "utf-8"});
        fs.writeFileSync(`${baseName}.${FILENAME_OPTIONS.EXTENSION_NAME}`, "random");
        fs.writeFileSync(otherFile, "random");

        const ts = readTimestamps();
        const timestampArr = getTimestampArray(ts, "\n");
        args = {
            timestamp: timestampText,
            ...validator.checkTimestampInput(timestampArr)
        };
    })

    afterEach(() => {
        args = {...argsInit}
    })

    test("should create expected files", async () => {
        const spyLog = vi.spyOn(console, "log").mockImplementation(vi.fn())
        const expectedFiles = [
            FILENAME_OPTIONS.TIMESTAMPS_FILENAME,
            outputFilenameFormatter(baseName),
            baseName,
            `${baseName}.txt`,
            otherFile
        ]

        main(args, spy)

        const files = fs.readdirSync(".")
        const copiedData = fs.readFileSync(baseName + ".txt", "utf-8")
        const totalTimeLogged = sexagesimalFormat((1 + 2 + 3 + 4 + 5) * 60);

        expect(files).toEqual(expect.arrayContaining(expectedFiles))

        expect(copiedData).toBe(timestampText)
        expect(spyLog).toHaveBeenCalledWith(expect.stringMatching(/merging video segments/i))
        expect(spyLog).toHaveBeenCalledWith(expect.stringMatching(/has been created/i))
        expect(spyLog).toHaveBeenCalledWith(expect.stringMatching(
            new RegExp(`should be about ${totalTimeLogged}`, "i")
        ))
        expect(spyLog).toHaveBeenCalledWith(expect.stringMatching(/saved .+\d+.+ mb/i))
    })

    test("should not create timestamp copy", async () => {
        vi.spyOn(APP_OPTIONS, "KEEP_TIMESTAMP_COPY", "get").mockReturnValue(false)
        const expectedFiles = [
            FILENAME_OPTIONS.TIMESTAMPS_FILENAME,
            outputFilenameFormatter(baseName),
            baseName,
            otherFile
        ]

        main(args, spy)

        const files = fs.readdirSync(".")
        expect(files).toEqual(expect.arrayContaining(expectedFiles))
    })

    test("should remove video segment folder", async () => {
        vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(false)
        const expectedFiles = [
            FILENAME_OPTIONS.TIMESTAMPS_FILENAME,
            outputFilenameFormatter(baseName),
            `${baseName}.txt`,
            otherFile
        ]

        main(args, spy)

        const files = fs.readdirSync(".")
        expect(files).toEqual(expect.arrayContaining(expectedFiles))
        expect(files).not.toContain(baseName)
    })

    test("should abort merging videos", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue(errorFile);
        vi.spyOn(APP_OPTIONS, "IGNORE_ERRORS", "get").mockReturnValue(false);
        const logSpy = vi.spyOn(console, "log");

        main(args, spy)

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/abort merging/i))

        const dir = fs.readdirSync(".");
        expect(dir).not.toContain(outputFilenameFormatter(baseName))
        expect(dir).toContain(baseName)

        const segmentDir = fs.readdirSync(baseName);
        videoSegments.forEach(segment => {
            expect(segmentDir).toContain(segment)
        })
    })
})