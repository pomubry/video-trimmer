import { describe, expect, test, vi } from "vitest";

import * as fileSystem from "../system/filesystem.js";
import { getVideoDuration } from "../system/childProcess.js";
import { checkFileSizeDiff, checkVideoDurationErrors } from "./validator.js";

describe("checkVideoDurationErrors", () => {
    const spy = vi.fn()
    const baseName = "randomVideo"
    const videoSegments = new Array(5)
        .fill(0)
        .map((_, i) => `${baseName}_${i + 1}.mp4`)

    test("should return empty array if no large disparity in duration was found", () => {
        const videoDuration = [0, 0, 0, 0, 0]
        vi.mocked(getVideoDuration).mockReturnValue(0);
        vi.spyOn(console, "log").mockImplementation(vi.fn());

        const possibleErrors = checkVideoDurationErrors(videoSegments, videoDuration, baseName, spy);

        expect(possibleErrors.length).toBe(0);
    })

    test("should return 2 errors", () => {
        const videoDuration = [1, 4, 5, 6, 10]
        vi.mocked(getVideoDuration).mockReturnValue(5);
        vi.spyOn(console, "log").mockImplementation(vi.fn());

        const possibleErrors = checkVideoDurationErrors(videoSegments, videoDuration, baseName, spy);

        expect(possibleErrors.length).toBe(2);
    })

    test("should log 3 okay and 2 errors", () => {
        const videoDuration = [1, 4, 5, 6, 10]
        const spyLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
        const okayString = expect.stringMatching(/okay/i);
        const errorString = expect.stringMatching(/error/i);
        vi.mocked(getVideoDuration).mockReturnValue(5);

        checkVideoDurationErrors(videoSegments, videoDuration, baseName, spy);

        expect(spyLog).toHaveBeenNthCalledWith(1, errorString)
        expect(spyLog).toHaveBeenNthCalledWith(2, okayString)
        expect(spyLog).toHaveBeenNthCalledWith(3, okayString)
        expect(spyLog).toHaveBeenNthCalledWith(4, okayString)
        expect(spyLog).toHaveBeenNthCalledWith(5, errorString)
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

    test(`should add an error to EndErrorLogger`, () => {
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