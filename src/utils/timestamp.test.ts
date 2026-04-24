import {afterEach, describe, expect, test, vi} from "vitest";
import {getTimestampArray, processTimestamps} from "./timestamp.js";

afterEach(() => {
    vi.restoreAllMocks()
})

describe("processTimestamps", () => {
    test("Should return an array without video filename", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000"
        ]

        const output = [
            ["00:00:00.000", "00:01:00.000"],
            ["00:02:00.000", "00:04:00.000"],
            ["00:05:00.000", "00:08:00.000"]
        ]

        const res = processTimestamps(input);

        expect(res.timestampPairs).toEqual(expect.arrayContaining(output));
    })

    test("Should return the total video runtime in seconds", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000"
        ]

        const res = processTimestamps(input);

        expect(res.totalTime).toBe(60 + 120 + 180);
    })

    test("Should return the duration of each video segments", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000"
        ]

        const res = processTimestamps(input);

        expect(res.videoSegmentDurations).toEqual([60, 120, 180])
    })

    test("Should return the video filename", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000"
        ]

        const res = processTimestamps(input);

        expect(res.videoFilename).toEqual("input.mp4");
    })

    test("Should return an error for invalid timestamp format", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "invalid timestamp",
            "00:05:00.000 00:08:00.000"
        ]

        const spy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        expect(() => processTimestamps(input)).toThrowError(/timestamps errors/i);
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/invalid timestamp format at line 3/i))

    })

    test("Should log an error if the first timestamp is greater than the second", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:05:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000"
        ]

        const spy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        expect(() => processTimestamps(input)).toThrowError(/timestamps errors/i);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/timestamp duration error at line 3/i))
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Timestamp \[00:04:00.000] should be greater than \[00:05:00.000]/i))
    })

    test("Should log an error if the first timestamp is equal the second timestamp of the previous iteration", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:04:00.000 00:08:00.000"
        ]

        const spy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        expect(() => processTimestamps(input)).toThrowError(/timestamps errors/i);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(/(?=.*duplicate)(?=.*line 3 and line 4)/i))
    })
})

describe("getTimestampArray", () => {
    test("Should return an array of timestamps", () => {
        const timestamp = `input.mp4
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`
        const expectedArray = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000",
            "00:09:00.000 00:13:00.000",
            "00:14:00.000 00:19:00.000"
        ]

        const res = getTimestampArray(timestamp);
        expect(res).toEqual(expectedArray)
    })
})