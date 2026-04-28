import path from "node:path";
import {describe, expect, test, vi} from "vitest";
import {fs} from "memfs";

import {createVideoSegment, mergeVideoSegments, getVideoDuration} from "./childProcess.js";
import {FFMPEG_OPTIONS, FILENAME_OPTIONS} from "../config.js";

describe("createVideoSegment", () => {
    let baseName = "segment"

    test("should create a file", () => {
        const filename = `${baseName}_001.${FILENAME_OPTIONS.EXTENSION_NAME}`
        const fullPath = path.join(baseName, filename)
        fs.mkdirSync(baseName)

        createVideoSegment(`ffmpeg -i "${baseName}.mp4" -c:v otherOptions "${fullPath}"`, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS)

        const dir = fs.readdirSync(".");
        const dirItems = fs.readdirSync(baseName);
        expect(dir).toContain(baseName)
        expect(dirItems).toContain(filename)
    })

    test("should accept japanese characters in input file", () => {
        baseName = "あえいおうアエイオウ東京";
        const jpFilename = `${baseName}_001.${FILENAME_OPTIONS.EXTENSION_NAME}`
        const fullPath = path.join(baseName, jpFilename)
        fs.mkdirSync(baseName)

        createVideoSegment(`ffmpeg -i "${baseName}.mp4" -c:v otherOptions "${fullPath}"`, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS)

        const dir = fs.readdirSync(".");
        const dirItems = fs.readdirSync(baseName);
        expect(dir).toContain(baseName)
        expect(dirItems).toContain(jpFilename)
        baseName = "segment";
    })
})

describe("mergeVideoSegments", () => {
    test("should create a file", () => {
        const filename = `sample (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`

        mergeVideoSegments(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, filename, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS)

        const dir = fs.readdirSync(".");
        expect(dir).toContain(filename)
    })
})

describe("getVideoDuration", () => {
    test("should throw an error", () => {
        expect(() => getVideoDuration("abc", "def")).toThrow();
    })

    test("should be properly mocked", () => {
        vi.mocked(getVideoDuration).mockReturnValueOnce(123);
        expect(getVideoDuration("abc", "def")).toBe(123);
    })
})