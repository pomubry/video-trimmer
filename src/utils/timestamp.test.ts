import { beforeEach, describe, expect, test, vi } from "vitest";
import { fs } from "memfs";

import { removeIndent } from "./formatter.js";
import { getMainArgs, secondsToHms, getTimestampArray } from "./timestamp.js";
import { APP_OPTIONS, FFMPEG_OPTIONS } from "../config.js";

import type { MainArgs } from "../types/index.js";

const getValidInput = (inputVideo: string) => [
    inputVideo,
    "00:00:00.000 00:01:00.000",
    "00:02:00.000 00:04:00.000",
    "00:05:00.000 00:08:00.000"
]

const generateMainArgs = (inputVideo: string) => {
    const mainArgs: MainArgs = {
        timestamp: removeIndent(`${inputVideo}
            00:00:00.000 00:01:00.000
            00:02:00.000 00:04:00.000
            00:05:00.000 00:08:00.000`),
        timestampPairs: [
            ["00:00:00.000", "00:01:00.000"],
            ["00:02:00.000", "00:04:00.000"],
            ["00:05:00.000", "00:08:00.000"]
        ],
        totalTime: (1 + 2 + 3) * 60,
        videoSegmentDurations: [60, 120, 180],
        videoFilename: inputVideo
    }

    return mainArgs;
}

describe("getMainArgs", () => {
    let inputVideo = "";
    let timestampArr: string[] = [];

    const setup = (newInputVideo: string) => {
        inputVideo = newInputVideo;
        fs.writeFileSync(newInputVideo, "random");
        timestampArr = getValidInput(newInputVideo);
    }

    beforeEach(() => {
        setup("input.mp4");
    })

    test("should return MainArgs object", () => {
        const mainArgs = generateMainArgs(inputVideo)

        const res = getMainArgs(timestampArr);

        expect(res).toEqual(mainArgs);
    })

    test("should auto rename input and timestamp", () => {
        vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValue(true);
        const oldFilename = "input! video@.mp4";
        const newFilename = "input video.mp4";
        const mainArgs = generateMainArgs(newFilename)
        setup(oldFilename);

        const res = getMainArgs(timestampArr);

        expect(res).toEqual(mainArgs);
    })

    describe("processTimestamps", () => {
        test("should return the video filename", () => {
            const res = getMainArgs(timestampArr);

            expect(res.videoFilename).toEqual("input.mp4");
        })

        // edge case: last string is empty
        test("should accept array with empty string at the end", () => {
            timestampArr.push("");
            const res = getMainArgs(timestampArr);

            expect(res.videoFilename).toEqual("input.mp4");
        })

        describe("timestampRegex", () => {
            test("should not throw an error for valid timestamp format", () => {
                const validTimestamps = [
                    "12:34:56.123456789 13:34:56.123456789", // Properly formatted timestamp
                    "12:34:56.123 12:34:56.123456789", // Timestamp with 3 decimal place
                ]

                validTimestamps.forEach(timestamp => {
                    expect(() => getMainArgs([...timestampArr, timestamp])).not.toThrowError();
                })
            })

            test("should throw an error for invalid timestamp format", () => {
                const errors = [
                    "12:34:56.123456789 12:34:56.12", // Decline timestamp with 2 or less decimal place
                    "12:34:56.1234567891 12:34:56.123456789", // Decline timestamp with 10 or more decimal place 
                    "a12:34:56.1234567891 12:34:56.123456789 b", // Decline timestamp with invalid characters from each end 
                    "\n12:34:56.123456789 12:34:56.123456789\n", // Decline timestamp with newline 
                    "12:34:56.123456789\t12:34:56.123456789", // Decline timestamp with tab separator 
                    "12:34:56.123456789  12:34:56.123456789", // Decline timestamp with double space
                    // eslint-disable-next-line no-useless-escape
                    "12:34:56.123456789\s12:34:56.123456789" // Decline timestamp with special char for whitespace
                ]

                errors.forEach(error => {
                    const spy = vi.spyOn(console, "error").mockImplementation(vi.fn())

                    expect(() => getMainArgs([...timestampArr, error])).toThrowError(/timestamp errors/i);
                    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/invalid timestamp format at line 5/i))
                })
            })
        })

        test("should log an error if the first timestamp is greater than the second", () => {
            const timestampArr = [
                inputVideo,
                "00:00:00.000 00:01:00.000",
                "00:05:00.000 00:04:00.000",
                "00:05:00.000 00:08:00.000"
            ]

            const spy = vi.spyOn(console, "error").mockImplementation(vi.fn())

            expect(() => getMainArgs(timestampArr)).toThrowError(/timestamp errors/i);
            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/timestamp duration error at line 3/i))
            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Timestamp \[00:04:00.000] should be greater than \[00:05:00.000]/i))
        })

        describe("checkDuplicateTimestamp", () => {
            test("should log an error if the first timestamp is equal the second timestamp of the previous iteration", () => {
                const timestampArr = [
                    inputVideo,
                    "00:00:00.000 00:01:00.000",
                    "00:02:00.000 00:04:00.000",
                    "00:04:00.000 00:08:00.000"
                ]

                const spy = vi.spyOn(console, "error").mockImplementation(vi.fn())

                expect(() => getMainArgs(timestampArr)).toThrowError(/timestamp errors/i);
                expect(spy).toHaveBeenCalledOnce();
                expect(spy).toHaveBeenCalledWith(expect.stringMatching(/(?=.*duplicate)(?=.*line 3 and line 4)/i))
            })
        })

        test("should return the total video runtime in seconds", () => {
            const res = getMainArgs(timestampArr);

            expect(res.totalTime).toBe(60 + 120 + 180);
        })

        test("should return the duration of each video segments", () => {
            const res = getMainArgs(timestampArr);

            expect(res.videoSegmentDurations).toEqual([60, 120, 180])
        })

        describe("getTimestampPair", () => {
            test("should return an array of timestamp pairs", () => {
                const output = [
                    ["00:00:00.000", "00:01:00.000"],
                    ["00:02:00.000", "00:04:00.000"],
                    ["00:05:00.000", "00:08:00.000"]
                ]

                const res = getMainArgs(timestampArr);

                expect(res.timestampPairs).toEqual(expect.arrayContaining(output));
            })

            test("should have adjusted values if offset > 0", () => {
                vi.spyOn(FFMPEG_OPTIONS, "OFFSET", "get").mockReturnValue(5);
                const output = [
                    ["00:00:05.000", "00:01:05.000"],
                    ["00:02:05.000", "00:04:05.000"],
                    ["00:05:05.000", "00:08:05.000"]
                ]

                const res = getMainArgs(timestampArr);

                expect(res.timestampPairs).toEqual(expect.arrayContaining(output));
            })
        })
    })

    describe("checkFileExtension", () => {
        test("should throw with invalid input", () => {
            setup("input.exe");
            expect(() => getMainArgs(timestampArr)).toThrow(/(?=.*exe is not supported)(?=.*Only the following extensions are valid)/is) // use 's' flag if patterns are on different lines
        })

        test("should not throw with valid input", () => {
            expect(() => getMainArgs(timestampArr)).not.toThrow()
        })
    })

    describe("checkVideoFile", () => {
        test("should throw if input video doesn't exist", () => {
            fs.rmSync(inputVideo);
            expect(() => getMainArgs(timestampArr)).toThrow();
        })
    })

    describe("checkVideoFilename", () => {
        test("should accept valid input video filename", () => {
            setup("input WITHOUT_invalid-characters.mp4");
            expect(() => getMainArgs(timestampArr)).not.toThrow();
        })

        test("should throw with invalid input video characters", () => {
            const invalidChars = ["`", "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "=", "[", "]", "{", "}", "\\", "|", ";", ":", "'", "\"", "<", ">", "?"];

            invalidChars.forEach(char => {
                setup(`inputShouldHaveNo${char}.mp4`);
                expect(() => getMainArgs(timestampArr)).toThrow(/(?=.*special characters)(?=.*try renaming)(?=.*inputShouldHaveNo.mp4)/is);
            })
        })

        test("should return suggested filename based on config", () => {
            vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValue(true);
            setup("my! invalid@input$.mp4");
            const newFilename = "my invalidinput.mp4"

            const res = getMainArgs(timestampArr);

            expect(res.videoFilename).toBe(newFilename);
        })

        test("should return sanitized string timestamp", () => {
            const output = removeIndent(`${inputVideo}
                00:00:00.000 00:01:00.000
                00:02:00.000 00:04:00.000
                00:05:00.000 00:08:00.000`);

            const res = getMainArgs(timestampArr);

            expect(res.timestamp).toBe(output)
        })

        test("should return sanitized string timestamp with new filename", () => {
            setup("invalid@input.mp4");
            vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValue(true);
            const output = removeIndent(`invalidinput.mp4
                00:00:00.000 00:01:00.000
                00:02:00.000 00:04:00.000
                00:05:00.000 00:08:00.000`);

            const res = getMainArgs(timestampArr);

            expect(res.timestamp).toBe(output)
        })
    })
})

describe("secondsToHms", () => {
    test("should convert input to sexagesimal seconds", () => {
        const res = secondsToHms(30);
        expect(res).toBe("00:00:30.000")
    })

    test("should convert input to sexagesimal minutes", () => {
        const res = secondsToHms(120);
        expect(res).toBe("00:02:00.000")
    })

    test("should convert input to sexagesimal hour", () => {
        const res = secondsToHms(3600);
        expect(res).toBe("01:00:00.000")
    })
})

describe("removeIndent", () => {
    test("Should return an array of timestamps", () => {
        const timestamp = removeIndent(`input.mp4
        00:00:00.000 00:01:00.000
        00:02:00.000 00:04:00.000
        00:05:00.000 00:08:00.000
        00:09:00.000 00:13:00.000
        00:14:00.000 00:19:00.000`
        )

        const expectedArray = [
            "input.mp4",
            "00:00:00.000 00:01:00.000",
            "00:02:00.000 00:04:00.000",
            "00:05:00.000 00:08:00.000",
            "00:09:00.000 00:13:00.000",
            "00:14:00.000 00:19:00.000"
        ]

        const res = getTimestampArray(timestamp, "\n");
        expect(res).toEqual(expectedArray)
    })
})