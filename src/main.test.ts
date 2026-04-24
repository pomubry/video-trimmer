import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {fs} from "memfs";

import {main} from "./main.js";
import * as validator from "./utils/validator.js";
import {readTimestamps} from "./repositories/filesystem.js";
import {outputFilenameFormatter, videoCounter} from "./utils/formatter.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "./config.js";

const baseName = "segment"
const timestampText = `${baseName}.mp4
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`
const videoSegments = new Array(5)
    .fill(0)
    .map((_, i) => `${baseName}_${videoCounter(i + 1)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)
const errorFile = videoSegments.filter((_, i) => i % 2 === 0)

describe("main function", () => {
    let ts = "";

    beforeEach(() => {
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampText, {encoding: "utf-8"});
        fs.writeFileSync(`${baseName}.mp4`, "random");
        ts = readTimestamps();
    })

    afterEach(() => {
        ts = ""
    })

    test("should create an output file", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue([]);

        main(ts)

        const files = fs.readdirSync(".")
        expect(files).toContain(outputFilenameFormatter(baseName))
    })

    test("should log that no problems were found", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue([]);
        const logSpy = vi.spyOn(console, "log");

        main(ts)

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/no problems were found/i))
    })

    test("should log possible errors", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue(errorFile);
        const logSpy = vi.spyOn(console, "log");
        const errorSpy = vi.spyOn(console, "error");

        main(ts)

        expect(logSpy).not.toHaveBeenCalledWith(expect.stringMatching(/no problems were found/i))
        expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/possible errors/i))
    })

    test("should abort merging videos", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue(errorFile);
        vi.spyOn(APP_OPTIONS, "IGNORE_ERRORS", "get").mockReturnValue(false);
        const logSpy = vi.spyOn(console, "log");
        const errorSpy = vi.spyOn(console, "error");

        main(ts)

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/abort merging/i))
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringMatching(/no problems were found/i))
        expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/possible errors/i))

        const dir = fs.readdirSync(".");
        expect(dir).not.toContain(outputFilenameFormatter(baseName))
        expect(dir).toContain(baseName)

        const segmentDir = fs.readdirSync(baseName);
        videoSegments.forEach(segment => {
            expect(segmentDir).toContain(segment)
        })
    })

})