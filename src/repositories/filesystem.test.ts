import path from "node:path";
import {vi, describe, test, beforeEach, expect} from 'vitest'
import {fs} from "memfs";

import {outputFilenameFormatter, sexagesimalFormat} from "../utils/formatter.js";
import {checkVideoFile, mergeVideos, readTimestamps} from "./filesystem.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "../config.js";

import type {MergeOptions} from "../types/index.js";

const baseName = "segment"
const videoSegments = new Array(3)
    .fill(0)
    .map((_, i) => `${baseName}_${i + 1}.mp4`)
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

describe("Merge video function", () => {
    const args: MergeOptions = {
        videoSegments,
        basename: baseName,
        elapsedTime: 0,
        videoDuration: 10
    }
    const otherFile = "other-file.txt"

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {
        })

        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, randomText);
        fs.writeFileSync(otherFile, randomText);
        fs.mkdirSync(baseName)
        videoSegments.forEach(segment => {
            const file = path.join(baseName, segment)
            fs.writeFileSync(file, randomText)
        })
    })

    test("Should merge the video segments", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(vi.fn())
        const expectedFiles = [
            FILENAME_OPTIONS.TIMESTAMPS_FILENAME,
            outputFilenameFormatter(baseName),
            baseName,
            `${baseName}.txt`
        ]

        mergeVideos(args);
        const files = fs.readdirSync(".")
        const copiedData = fs.readFileSync(baseName + ".txt", "utf-8")
        const totalTimeLogged = sexagesimalFormat(args.videoDuration);
        const processingTime = sexagesimalFormat(args.elapsedTime / 1000);

        expectedFiles.forEach(file => {
            expect(files).toContain(file)
        })
        expect(files).toContain(otherFile)
        expect(copiedData).toBe(randomText)
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/merging video segments/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/has been created/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(
            new RegExp(`should be about ${totalTimeLogged}`, "i")
        ))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(
            new RegExp(`total processing time: ${processingTime}`, "i")
        ))
    })

    test("Should remove the video segments", async () => {
        vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(false)
        const expectedFiles = [
            FILENAME_OPTIONS.TIMESTAMPS_FILENAME,
            outputFilenameFormatter(baseName),
            `${baseName}.txt`
        ]

        mergeVideos(args);
        const files = fs.readdirSync(".")

        expectedFiles.forEach(file => {
            expect(files).toContain(file)
        })
        expect(files).toContain(otherFile)
        expect(files).not.toContain(baseName)
    })
})