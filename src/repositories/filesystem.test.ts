import path from "node:path";
import {vi, describe, test, beforeEach, afterEach, expect} from 'vitest'
import {fs, vol} from "memfs";

import {outputFilenameFormatter, sexagesimalFormat} from "../utils/formatter.js";
import * as config from "../utils/config.js";
import {
    checkVideoFile,
    mergeVideos,
    readTimestamps
} from "./filesystem.js";

import type {MergeOptions} from "../types/index.js";

const hoistedArgs = vi.hoisted(() => ({
    outputFilename: ""
}))

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock(import("../services/childProcess.js"), async (importOriginal) => {
    const original = await importOriginal()
    return {
        ...original,
        mergeVideoSegments: () => fs.writeFileSync(hoistedArgs.outputFilename, "random text")
    }
})

beforeEach(() => {
    vol.reset()
    vol.mkdirSync(process.cwd(), {recursive: true})
})

afterEach(() => {
    vi.restoreAllMocks()
})

const baseName = "segment"
const videoSegments = new Array(3)
    .fill(0)
    .map((_, i) => `${baseName}_${i + 1}.mp4`)
const newTimestampFilename = "otherFile.txt"
const randomText = "some text"

describe("Timestamp reader", () => {
    test("Should read the timestamp file", () => {
        fs.writeFileSync(config.timestampsFilename, randomText);

        const res = readTimestamps();

        expect(res).toBe(randomText)
    })

    test("Should read a different file according to config", () => {
        vi.spyOn(config, "timestampsFilename", "get").mockReturnValue(newTimestampFilename)
        fs.writeFileSync(config.timestampsFilename, randomText);

        const res = readTimestamps();

        expect(config.timestampsFilename).toBe(newTimestampFilename)
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
        baseOutputPath: baseName,
        nameOnly: baseName,
        isVideoSegmentKept: "yes",
        timeDiff: 0,
        totalTime: 10
    }
    const otherFile = "other-file.txt"
    hoistedArgs.outputFilename = outputFilenameFormatter(baseName);

    beforeEach(() => {
        fs.writeFileSync(config.timestampsFilename, randomText);
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
            config.timestampsFilename,
            outputFilenameFormatter(baseName),
            baseName,
            `${baseName}.txt`
        ]

        mergeVideos(args);
        const files = fs.readdirSync(".")
        const copiedData = fs.readFileSync(baseName + ".txt", "utf-8")
        const totalTimeLogged = sexagesimalFormat(args.totalTime);
        const processingTime = sexagesimalFormat(args.timeDiff / 1000);

        expectedFiles.forEach(file => {
            expect(files).toContain(file)
        })
        expect(files).toContain(otherFile)
        expect(copiedData).toBe(randomText)
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/temporarily/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/merging video segments/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/has been created/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/will be kept/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/creating copy of/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(
            new RegExp(`should be about ${totalTimeLogged}`, "i")
        ))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(
            new RegExp(`total processing time: ${processingTime}`, "i")
        ))
    })

    test("Should remove the video segments", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(vi.fn())
        args.isVideoSegmentKept = "no";
        const expectedFiles = [
            config.timestampsFilename,
            outputFilenameFormatter(baseName),
            `${baseName}.txt`
        ]

        mergeVideos(args);
        const logged = `total video segments removed: ${videoSegments.length}`
        const files = fs.readdirSync(".")

        expectedFiles.forEach(file => {
            expect(files).toContain(file)
        })
        expect(files).toContain(otherFile)
        expect(files).not.toContain(baseName)
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/removing video segment/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(new RegExp(logged, "i")))
    })
})