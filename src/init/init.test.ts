import {beforeEach, describe, expect, test, vi} from "vitest";
import {fs} from "memfs";

import * as main from "./main.js";
import * as childProcess from "../services/childProcess.js";
import * as filesystem from "../repositories/filesystem.js";
import {init} from "./init.js";
import {FILENAME_OPTIONS} from "../config.js";

const baseName = "segment"

const getSingleTimestamp = (videoFilename: string) =>
    `${videoFilename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`

const singleTimestamp = getSingleTimestamp(`${baseName}1.mp4`)

const batchTimestamp = `${getSingleTimestamp(`${baseName}1.mp4`)}
@batch@
${getSingleTimestamp(`${baseName}2.mp4`)}
@batch@
${getSingleTimestamp(`${baseName}3.mp4`)}
@batch@`

const getArgs = (videoFilename: string) => {
    const videoSegmentDurations = [60, 120, 180, 240, 300]
    return {
        timestamp: getSingleTimestamp(videoFilename),
        timestampPairs: [
            ["00:00:00.000", "00:01:00.000"],
            ["00:02:00.000", "00:04:00.000"],
            ["00:05:00.000", "00:08:00.000"],
            ["00:09:00.000", "00:13:00.000"],
            ["00:14:00.000", "00:19:00.000"]
        ],
        totalTime:
            videoSegmentDurations.reduce((acc, cur) => acc + cur, 0),
        videoSegmentDurations,
        videoFilename
    }
}

describe("init function", () => {
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {
        })
        vi.spyOn(console, "error").mockImplementation(() => {
        })
    })

    test("should do single operation", async () => {
        const spyMain = vi.spyOn(main, "main").mockImplementation(vi.fn());
        const videoFilename = `${baseName}1.mp4`
        const expectedArgs = getArgs(videoFilename);
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, singleTimestamp, {encoding: "utf-8"});
        fs.writeFileSync(videoFilename, "random");

        init();

        expect(spyMain).toHaveBeenCalledTimes(1)
        expect(spyMain).toHaveBeenCalledWith(expectedArgs, expect.any(Function));
    })

    test("should do batch operation", async () => {
        const spyMain = vi.spyOn(main, "main").mockImplementation(() => {
        })
        const args = [
            getArgs(`${baseName}1.mp4`),
            getArgs(`${baseName}2.mp4`),
            getArgs(`${baseName}3.mp4`)
        ]
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, batchTimestamp, {encoding: "utf-8"});
        args.forEach(arg => {
            fs.writeFileSync(arg.videoFilename, "random");
        })

        init();

        expect(spyMain).toHaveBeenCalledTimes(3)
        args.forEach((arg, index) => {
            expect(spyMain).toHaveBeenNthCalledWith(index + 1, arg, expect.any(Function));
        })
    })

    test("should detect error in single operation", async () => {
        const videoFilename = `${baseName}1.mp4`
        const timestampWithError = `${videoFilename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:09:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`

        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampWithError, {encoding: "utf-8"});
        fs.writeFileSync(videoFilename, "random");

        expect(() => init()).toThrow(/timestamp errors/i);
    })

    test("should detect error in batch operation", async () => {
        const videoFilename = `${baseName}.mp4`
        const timestampWithError = `${videoFilename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000
@batch@
${videoFilename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:09:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000
@batch@
${videoFilename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`

        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampWithError, {encoding: "utf-8"});
        fs.writeFileSync(videoFilename, "random");

        expect(() => init()).toThrow(/timestamp errors/i);
    })

    test("should log errors at the end", () => {
        const spyError = vi.spyOn(console, "error");
        const spyGetFileSize = vi.spyOn(filesystem, "getFileSize");
        const spyGetVideoDuration = vi.spyOn(childProcess, "getVideoDuration")
        const args = [
            getArgs(`${baseName}1.mp4`),
            getArgs(`${baseName}2.mp4`),
            getArgs(`${baseName}3.mp4`)
        ]
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, batchTimestamp, {encoding: "utf-8"});
        args.forEach(arg => {
            arg.timestampPairs.forEach((_, i) => {
                let value = (i + 1) % 5 === 0 ? ((i + 1) * 60) - 5 : (i + 1) * 60
                spyGetVideoDuration.mockReturnValueOnce(value)
            })
            spyGetFileSize
                .mockReturnValueOnce(5000 * 5000)
                .mockReturnValueOnce(2000 * 2000)
            fs.writeFileSync(arg.videoFilename, "random");
        })

        init();

        expect(spyError).toHaveBeenCalledTimes(3)
        expect(spyError).toHaveBeenNthCalledWith(1, expect.stringMatching(/possible error/ig))
    })
})