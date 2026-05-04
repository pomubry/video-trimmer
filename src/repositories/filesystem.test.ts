import path from "node:path";
import {vi, describe, test, beforeEach, expect} from 'vitest'
import {fs} from "memfs";

import * as fileSystem from "./filesystem.js";
import {
    checkVideoFile,
    createSegmentList,
    createTimestampCopy,
    readTimestamps,
    removeOutputIfExists,
    removeSegmentList,
    removeVideoSegments,
    renameFile
} from "./filesystem.js";
import {outputFilenameFormatter, videoCounter} from "../utils/formatter.js";
import {checkFileSizeDiff} from "../utils/validator.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "../config.js";

import {EndLogError} from "../types/errors.js";

const baseName = "input"
const videoSegments = new Array(3)
    .fill(0)
    .map((_, i) => `${baseName}_${videoCounter(i + 1)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)
const newTimestampFilename = "otherFile.txt"
const randomText = "some text"

describe("Timestamp reader", () => {
    test("Should read the timestamp file", () => {
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, randomText);

        const res = readTimestamps();

        expect(res).toBe(randomText)
    })

    test("Should read a different file according to config", () => {
        vi.spyOn(FILENAME_OPTIONS, "TIMESTAMPS_FILENAME", "get").mockReturnValue(newTimestampFilename)
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, randomText);

        const res = readTimestamps();

        expect(FILENAME_OPTIONS.TIMESTAMPS_FILENAME).toBe(newTimestampFilename)
        expect(res).toBe(randomText)
    })

    test("Should throw a custom error message", () => {
        expect(() => readTimestamps()).toThrow(/was not found/)
    })
})


describe("Video File Checker", () => {
    test("Should not throw an error if video is found", () => {
        const videoFile = "input.mp4"
        fs.writeFileSync(videoFile, randomText)
        expect(() => checkVideoFile(videoFile)).not.toThrow()
    })

    test("Should throw an error if video is not found", () => {
        expect(() => checkVideoFile("non-existing-file.mp4")).toThrow(/was not found/i)
    })
})

describe("createSegmentList", () => {
    test("Should create a list of video segments", () => {
        const expectedText = `file '${path.join(baseName, `${baseName}_${videoCounter(1)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)}'
file '${path.join(baseName, `${baseName}_${videoCounter(2)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)}'
file '${path.join(baseName, `${baseName}_${videoCounter(3)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)}'`

        createSegmentList(videoSegments, baseName);

        const res = fs.readFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, {encoding: "utf-8"});
        expect(res).toBe(expectedText);
    })
})

describe("removeSegmentList", () => {
    test("Should remove the segment list file", () => {
        fs.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, randomText);

        removeSegmentList();

        expect(fs.readdirSync(".").length).toBe(0);
    })
})

describe("removeOutputIfExists", () => {
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {
        })
    })

    test("Should remove the output file if it exists", () => {
        const outputFilename = outputFilenameFormatter(baseName);
        fs.writeFileSync(outputFilename, randomText);

        removeOutputIfExists(outputFilename);

        const res = fs.readdirSync(".")
        expect(res.length).toBe(0);
    })

    test("Should keep other files", () => {
        const outputFilename = outputFilenameFormatter(baseName);
        fs.writeFileSync(outputFilename, randomText);
        fs.writeFileSync("otherFile.txt", randomText);

        removeOutputIfExists(outputFilename);

        const res = fs.readdirSync(".")
        expect(res.length).toBe(1);
    })

    test("Should not throw if output file does not exists", () => {
        const outputFilename = outputFilenameFormatter(baseName);

        expect(() => removeOutputIfExists(outputFilename)).not.toThrow();
    })
})

describe("removeVideoSegments", () => {
    beforeEach(() => {
        fs.mkdirSync(baseName)
        videoSegments.forEach(segment => {
            const file = path.join(baseName, segment)
            fs.writeFileSync(file, randomText)
        })
    })

    test("Should remove the video segments", async () => {
        vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(false)

        expect(fs.readdirSync(".").length).toBe(1);
        expect(fs.readdirSync(baseName).length).toBe(videoSegments.length);

        removeVideoSegments(baseName);

        expect(fs.readdirSync(".").length).toBe(0);
    })

    test("Should keep other files", () => {
        vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(false)
        fs.writeFileSync("otherFile.txt", randomText);

        expect(fs.readdirSync(".").length).toBe(2);
        expect(fs.readdirSync(baseName).length).toBe(videoSegments.length);

        removeVideoSegments(baseName);

        const res = fs.readdirSync(".")
        expect(res.length).toBe(1);
    })

    test("Should keep the video segments", async () => {
        vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(true)

        expect(fs.readdirSync(".").length).toBe(1);
        expect(fs.readdirSync(baseName).length).toBe(videoSegments.length);

        removeVideoSegments(baseName);

        expect(fs.readdirSync(".").length).toBe(1);
        expect(fs.readdirSync(baseName).length).toBe(videoSegments.length);
    })
})

describe("createTimestampCopy", () => {
    test("Should create a copy of the timestamp", () => {
        createTimestampCopy(baseName, randomText);

        expect(fs.readdirSync(".")).toContain(baseName + ".txt")
    })
})

describe("renameFile", () => {
    test("Should rename a file", () => {
        const oldName = "oldName.txt"
        const timestampArr = [oldName]
        const newName = "newName.txt"
        fs.writeFileSync(oldName, randomText)

        renameFile(timestampArr, newName);

        const res = fs.readFileSync(newName, {encoding: "utf-8"});
        expect(res).toBe(randomText)
    })
})

describe("getFileSizeDiff", () => {
    test("should return the amount of storage saved in MB", () => {
        const spy = vi.fn()
        const oldSize = 50000;
        const newSize = 10000;
        vi.spyOn(fileSystem, "getFileSize")
            .mockReturnValueOnce(oldSize)
            .mockReturnValueOnce(newSize)

        const res = checkFileSizeDiff("a", "b", spy)

        expect(res).toMatch(/saved .+\d+.+ mb/i)
        expect(spy).toHaveBeenCalledTimes(0)
    })

    test(`should add an error to ${EndLogError.name}`, () => {
        const spy = vi.fn()
        vi.spyOn(fileSystem, "getFileSize")
            .mockReturnValueOnce(10000)
            .mockReturnValueOnce(50000)
        const expectedRegex = /bigger than the original/ig

        const res = checkFileSizeDiff("a", "b", spy)

        expect(res).toMatch(expectedRegex)
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(expectedRegex))
    })
})