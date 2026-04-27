import {describe, expect, test, vi} from "vitest";
import {fs} from "memfs";

import {checkFileExtension, checkVideoDurationErrors, checkVideoFilename} from "./validator.js";
import {getVideoDuration} from "../services/childProcess.js";
import {APP_OPTIONS} from "../config.js";

describe("checkFileExtension", () => {
    test("Should throw with invalid input", () => {
        expect(() => checkFileExtension("input.exe")).toThrow(/(?=.*exe is not supported)(?=.*Only the following extensions are valid)/is)
    })

    test("Should not throw with valid input", () => {
        expect(() => checkFileExtension("input.mp4")).not.toThrow()
    })
})

describe("checkVideoFilename", () => {
    test("Should accept valid input video filename", () => {
        expect(() => checkVideoFilename("inputShouldHaveNoParenthesis.mp4")).not.toThrow();
    })

    test("Should throw with invalid input video characters", () => {
        expect(() => checkVideoFilename("inputShouldHaveNo`.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo~.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo!.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo@.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo#.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo$.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo%.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo^.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo&.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo*.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo().mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo=.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo[].mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo{}.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo\\.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo|.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo/.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo;.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo:.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo'.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo\".mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo,.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo<>.mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNo?.mp4")).toThrow();
    })

    test("should auto rename the file based on config", () => {
        vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValue(true);
        const oldFilename = "my! invalid@input$.mp4"
        const newFilename = "my_ invalid_input_.mp4"
        fs.writeFileSync(oldFilename, "random");

        checkVideoFilename(oldFilename);

        const dir = fs.readdirSync(".")
        expect(dir).toContain(newFilename)
        expect(dir).not.toContain(oldFilename)
    })

    test("should throw with a suggested filename", () => {
        const filename = "my! invalid@input$.mp4"
        const expectedFilename = "my_ invalid_input_.mp4"

        expect(() => checkVideoFilename(filename)).toThrow(expectedFilename)
    })
})

describe("checkVideoDuration", () => {
    const baseName = "randomVideo"
    const videoSegments = new Array(5)
        .fill(0)
        .map((_, i) => `${baseName}_${i + 1}.mp4`)

    test("should return empty array if no large disparity in duration was found", () => {
        const videoDuration = [0, 0, 0, 0, 0]
        vi.mocked(getVideoDuration).mockReturnValue(0);
        vi.spyOn(console, "log").mockImplementation(vi.fn());

        const possibleErrors = checkVideoDurationErrors(videoSegments, videoDuration, baseName);

        expect(possibleErrors.length).toBe(0);
    })

    test("should return 2 errors", () => {
        const videoDuration = [1, 4, 5, 6, 10]
        vi.mocked(getVideoDuration).mockReturnValue(5);
        vi.spyOn(console, "log").mockImplementation(vi.fn());

        const possibleErrors = checkVideoDurationErrors(videoSegments, videoDuration, baseName);

        expect(possibleErrors.length).toBe(2);
    })

    test("should log 3 okay and 2 errors", () => {
        const videoDuration = [1, 4, 5, 6, 10]
        const spy = vi.spyOn(console, "log").mockImplementation(vi.fn());
        const okayString = expect.stringMatching(/okay/i);
        const errorString = expect.stringMatching(/error/i);
        vi.mocked(getVideoDuration).mockReturnValue(5);

        checkVideoDurationErrors(videoSegments, videoDuration, baseName);

        expect(spy).toHaveBeenNthCalledWith(1, errorString)
        expect(spy).toHaveBeenNthCalledWith(2, okayString)
        expect(spy).toHaveBeenNthCalledWith(3, okayString)
        expect(spy).toHaveBeenNthCalledWith(4, okayString)
        expect(spy).toHaveBeenNthCalledWith(5, errorString)
    })
})