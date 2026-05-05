import {beforeEach, describe, expect, type MockInstance, test, vi} from "vitest";
import {fs} from "memfs";

import * as main from "./main.js";
import * as childProcess from "../services/childProcess.js";
import * as filesystem from "../repositories/filesystem.js";
import {init} from "./init.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "../config.js";

import type {MainArgs} from "../types/index.js";

const baseName = "segment";
const timestampPairs = [
    ["00:00:00.000", "00:01:00.000"],
    ["00:02:00.000", "00:04:00.000"],
    ["00:05:00.000", "00:08:00.000"],
    ["00:09:00.000", "00:13:00.000"],
    ["00:14:00.000", "00:19:00.000"]
];
const modify20 = () => timestampPairs[2]![0] = "00:09:00.000"
const reset20 = () => timestampPairs[2]![0] = "00:05:00.000"
const videoSegmentDurations = [60, 120, 180, 240, 300];

const createTimestamp = (videoFilename: string, timestampPairs: string[][]) =>
    [videoFilename, timestampPairs.map(pair => pair.join(" ")).join("\n")]
        .join("\n");

const mockErrorFileSizeAndDuration = (arg: MainArgs, tsIndex: number, spyGetVideoDuration: MockInstance, spyGetFileSize: MockInstance) => {
    arg.timestampPairs.forEach((_, i) => {
        let value = tsIndex === 1 && i + 1 === 5 ? ((i + 1) * 60) - 5 : (i + 1) * 60
        spyGetVideoDuration.mockReturnValueOnce(value)
    })
    spyGetFileSize
        .mockReturnValueOnce(5000 * 5000)
        .mockReturnValueOnce(tsIndex === 2 ? 6000 * 6000 : 2000 * 2000)
    fs.writeFileSync(arg.videoFilename, "random");
}

const getArgs = (videoFilename: string) => {
    return {
        timestamp: createTimestamp(videoFilename, timestampPairs),
        timestampPairs,
        totalTime:
            videoSegmentDurations.reduce((acc, cur) => acc + cur, 0),
        videoSegmentDurations,
        videoFilename
    }
}

describe("init function", () => {
    let spyMain: MockInstance;
    let spySuspend: MockInstance;
    let spyError: MockInstance;
    let spyGetFileSize: MockInstance;
    let spyGetVideoDuration: MockInstance;

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(vi.fn())
        vi.spyOn(console, "error").mockImplementation(vi.fn())
        spyMain = vi.spyOn(main, "main").mockImplementation(vi.fn())
        spySuspend = vi.spyOn(childProcess, "suspendSystem");
        spyError = vi.spyOn(console, "error");
        spyGetFileSize = vi.spyOn(filesystem, "getFileSize");
        spyGetVideoDuration = vi.spyOn(childProcess, "getVideoDuration")
        reset20();
    })

    describe("single operation", () => {
        const videoFilename = `${baseName}1.mp4`;
        const singleTimestamp = createTimestamp(videoFilename, timestampPairs)

        test("should pass expected arguments", async () => {
            const expectedArgs = getArgs(videoFilename);
            fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, singleTimestamp, {encoding: "utf-8"});
            fs.writeFileSync(videoFilename, "random");

            init();

            expect(spyMain).toHaveBeenCalledTimes(1)
            expect(spyMain).toHaveBeenCalledWith(expectedArgs, expect.any(Function));
            expect(spySuspend).toBeCalledTimes(1);
        })

        test("should log errors at the end", () => {
            spyMain.mockRestore();
            fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, singleTimestamp, {encoding: "utf-8"});
            const expectedArg = getArgs(videoFilename);
            mockErrorFileSizeAndDuration(expectedArg, 1, spyGetVideoDuration, spyGetFileSize)

            init();

            expect(spyError).toHaveBeenCalledTimes(1)
            expect(spyError).toHaveBeenNthCalledWith(1, expect.stringMatching(/possible error/ig))
            expect(spySuspend).toBeCalledTimes(1);
        })

        test("should throw error", async () => {
            modify20();
            const timestampWithError = createTimestamp(videoFilename, timestampPairs)
            fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampWithError, {encoding: "utf-8"});

            expect(() => init()).toThrow(/timestamp errors/i);
            expect(spySuspend).toBeCalledTimes(0);
        })
    })

    describe("batch operation", () => {
        const videoFilename1 = `${baseName}1.mp4`;
        const videoFilename2 = `${baseName}2.mp4`;
        const videoFilename3 = `${baseName}3.mp4`;

        const batchTimestamp = [
            createTimestamp(videoFilename1, timestampPairs),
            createTimestamp(videoFilename2, timestampPairs),
            createTimestamp(videoFilename3, timestampPairs)
        ]
            .join("\n@batch@\n")

        test("should pass expected arguments", async () => {
            fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, batchTimestamp, {encoding: "utf-8"});
            const expectedArgs = [
                getArgs(videoFilename1),
                getArgs(videoFilename2),
                getArgs(videoFilename3)
            ];
            expectedArgs.forEach(arg => {
                fs.writeFileSync(arg.videoFilename, "random");
            })

            init();

            expect(spyMain).toHaveBeenCalledTimes(expectedArgs.length)
            expectedArgs.forEach((arg, index) => {
                expect(spyMain).toHaveBeenNthCalledWith(index + 1, arg, expect.any(Function));
            })
            expect(spySuspend).toBeCalledTimes(1);
        })

        test("should log errors at the end", () => {
            spyMain.mockRestore();
            fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, batchTimestamp, {encoding: "utf-8"});
            const expectedArgs = [
                getArgs(videoFilename1),
                getArgs(videoFilename2),
                getArgs(videoFilename3)
            ]
            expectedArgs.forEach((arg, i) => {
                mockErrorFileSizeAndDuration(arg, i + 1, spyGetVideoDuration, spyGetFileSize)
            })

            init();

            expect(spyError).toHaveBeenCalledTimes(2)
            expect(spyError).toHaveBeenNthCalledWith(1, expect.stringMatching(/possible error/ig))
            expect(spyError).toHaveBeenNthCalledWith(2, expect.stringMatching(/new file size is bigger/ig))
            expect(spySuspend).toBeCalledTimes(1);
        })

        test("should throw error", async () => {
            modify20();
            const timestampWithError = [
                createTimestamp(videoFilename1, timestampPairs),
                createTimestamp(videoFilename2, timestampPairs),
                createTimestamp(videoFilename3, timestampPairs),
            ]
                .join("\n@batch@\n")

            fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampWithError, {encoding: "utf-8"});

            expect(() => init()).toThrow(/timestamp errors/i);
            expect(spySuspend).toBeCalledTimes(0)
        })
    })

    test("should rename video input and update timestamp", async () => {
        vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValue(true);
        const spyMain = vi.spyOn(main, "main").mockImplementation(vi.fn());
        const baseName = "video with invalid character!";
        const baseFileName = `${baseName}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
        const newFile = baseName.slice(0, -1);
        const newFileName = `${newFile}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, getSingleTimestamp(baseFileName), {encoding: "utf-8"});
        fs.writeFileSync(baseFileName, "random");
        const expectedArgs = getArgs(newFileName);

        init()

        const dir = fs.readdirSync(".");
        expect(spyMain).toHaveBeenCalledTimes(1)
        expect(spyMain).toHaveBeenCalledWith(expectedArgs, expect.any(Function));
        expect(dir).toContain(newFileName)
    })
})