import {afterEach, describe, expect, test, vi} from "vitest";
import {processTimestamps} from "./timestamp.js";

afterEach(() => {
    vi.restoreAllMocks()
})

describe("Process timestamp", () => {
    test("Should return a valid timestamp array with valid input", () => {
        const input = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000"
        ]

        const res = processTimestamps(input);

        expect(res.arr).toEqual(input);
        expect(res.totalTime).toBe(60 + 120 + 180)
        expect(res.videoSegmentDurations).toEqual([60, 120, 180])
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

    test("Should also log an error if the first timestamp is greater than the second", () => {
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

    test("Should also log an error if the first timestamp is equal the second timestamp of the previous iteration", () => {
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