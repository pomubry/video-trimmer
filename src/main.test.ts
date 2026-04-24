import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {fs} from "memfs";

import {main} from "./main.js";
import {readTimestamps} from "./repositories/filesystem.js";
import * as validator from "./utils/validator.js";
import {outputFilenameFormatter, videoCounter} from "./utils/formatter.js";
import {timestampSplitTrim} from "./utils/timestamp.js";
import {APP_OPTIONS, FILENAME_OPTIONS} from "./config.js";

import type {MainArgs} from "./types/index.js";

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
const argsInit: MainArgs = {
    timestampPairs: [[]],
    totalTime: 0,
    videoFilename: "",
    videoSegmentDurations: []
}

describe("main function", () => {
    let args = {...argsInit};

    beforeEach(() => {
        fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestampText, {encoding: "utf-8"});
        fs.writeFileSync(`${baseName}.mp4`, "random");
        const ts = readTimestamps();
        const timestampArr = timestampSplitTrim(ts);
        args = {...validator.checkTimestampInput(timestampArr)};
    })

    afterEach(() => {
        args = {...argsInit}
    })

    test("should create an output file", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue([]);

        main(args)

        const files = fs.readdirSync(".")
        expect(files).toContain(outputFilenameFormatter(baseName))
    })

    test("should log that no problems were found", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue([]);
        const logSpy = vi.spyOn(console, "log");

        main(args)

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/no problems were found/i))
    })

    test("should log possible errors", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue(errorFile);
        const logSpy = vi.spyOn(console, "log");
        const errorSpy = vi.spyOn(console, "error");

        main(args)

        expect(logSpy).not.toHaveBeenCalledWith(expect.stringMatching(/no problems were found/i))
        expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/possible errors/i))
    })

    test("should abort merging videos", async () => {
        vi.spyOn(validator, "checkVideoDurationErrors").mockReturnValue(errorFile);
        vi.spyOn(APP_OPTIONS, "IGNORE_ERRORS", "get").mockReturnValue(false);
        const logSpy = vi.spyOn(console, "log");
        const errorSpy = vi.spyOn(console, "error");

        main(args)

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