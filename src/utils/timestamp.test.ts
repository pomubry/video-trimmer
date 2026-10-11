import { beforeEach, describe, expect, test, vi } from "vitest";
import { fs } from "memfs";

import { removeIndent } from "./formatter.js";
import { getMainArgs, secondsToHms } from "./timestamp.js";
import { APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import type { MainArg } from "../types/index.js";

const baseName = "segment";

function readTimestamps() {
  return fs.createReadStream(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
}

function createTimestamp(filename: string) {
  return `${filename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`;
}

function createMainArg(inputVideo: string) {
  const mainArg: MainArg = {
    timestampPairs: [
      ["00:00:00.000", "00:01:00.000"],
      ["00:02:00.000", "00:04:00.000"],
      ["00:05:00.000", "00:08:00.000"],
      ["00:09:00.000", "00:13:00.000"],
      ["00:14:00.000", "00:19:00.000"],
    ],
    videoSegmentDurations: [60, 120, 180, 240, 300],
    videoFilename: inputVideo,
    oldFilename: inputVideo,
  };

  return mainArg;
}

describe("getMainArgs", () => {
  let inputVideo = "";

  function setup(newInputVideo: string, newTimestamp?: string) {
    fs.writeFileSync(newInputVideo, "random");
    fs.writeFileSync(
      FILENAME_OPTIONS.TIMESTAMPS_FILENAME,
      newTimestamp ?? createTimestamp(newInputVideo),
      {
        encoding: "utf-8",
      },
    );

    inputVideo = newInputVideo;
  }

  beforeEach(() => {
    setup(`${baseName}.${FILENAME_OPTIONS.EXTENSION_NAME}`);
  });

  describe("getMainArgs", () => {
    test("should return 1 MainArg", async () => {
      const mainArg = createMainArg(inputVideo);
      const readStream = readTimestamps();

      const res = await getMainArgs(readStream);

      expect(res).toEqual([mainArg]);
    });

    test("should return 2 MainArg", async () => {
      const mainArg = createMainArg(inputVideo);
      const inputVideo2 = `${baseName}2.${FILENAME_OPTIONS.EXTENSION_NAME}`;
      const newTimestampText = `${createTimestamp(inputVideo)}\n${createTimestamp(inputVideo2)}`;
      setup(inputVideo2, newTimestampText);
      const readStream = readTimestamps();

      const res = await getMainArgs(readStream);

      const mainArg2 = structuredClone(mainArg);
      mainArg2.oldFilename = inputVideo2;
      mainArg2.videoFilename = inputVideo2;
      expect(res).toEqual([mainArg, mainArg2]);
    });

    // edge case: last string is empty
    test("should accept array with empty string at the end", async () => {
      const newTimestampText = `${createTimestamp(inputVideo)}\n`;
      setup(inputVideo, newTimestampText);
      const readStream = readTimestamps();

      const res = await getMainArgs(readStream);

      const mainArg = createMainArg(inputVideo);
      expect(res.length).toBe(1);
      expect(res).toEqual([mainArg]);
    });

    test("should not throw an error for valid timestamp format", async () => {
      const newTimestampText = createTimestamp(inputVideo);
      const validTimestamps = [
        "12:34:56.123456789 13:34:56.123456789", // Properly formatted timestamp
        "12:34:56.123 12:34:56.123456789", // Timestamp with 3 decimal place
      ];

      for (const timestamp of validTimestamps) {
        const newTimestampTextFormat = `${newTimestampText}\n${timestamp}`;
        setup(inputVideo, newTimestampTextFormat);
        const readStream = readTimestamps();

        await expect(getMainArgs(readStream)).resolves.toBeDefined();
      }
    });

    test("should throw an error for invalid timestamp format", async () => {
      const timestamp = createTimestamp(inputVideo);
      const secondVid = "2nd.mp4";
      const errors = [
        "12:34:56.123456789 12:34:56.12", // Decline timestamp with 2 or less decimal place
        "12:34:56.1234567891 12:34:56.123456789", // Decline timestamp with 10 or more decimal place
        "a12:34:56.1234567891 12:34:56.123456789b", // Decline timestamp with invalid characters from each end
        "12:34:56.123456789\t12:34:56.123456789", // Decline timestamp with tab separator
        "12:34:56.123456789  12:34:56.123456789", // Decline timestamp with double space
      ];

      for (const error of errors) {
        const timestampWithError = `${timestamp}\n${error}`;
        setup(inputVideo, timestampWithError);
        setup(secondVid, timestampWithError);
        const readStream = readTimestamps();

        await expect(getMainArgs(readStream)).rejects.toThrow(
          /(video format .+ line 7)/i,
        );
      }
    });

    test("should log an error if the first timestamp is greater than the second", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(vi.fn());
      const newTimestamp = `${createTimestamp(inputVideo)}\n00:15:00.000 00:10:00.000`;
      setup(inputVideo, newTimestamp);
      const readStream = readTimestamps();

      await expect(getMainArgs(readStream)).rejects.toThrow(
        /timestamp errors/i,
      );
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/timestamp duration error at line 7/i),
      );
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(
          /Timestamp \[00:10:00.000] should be greater than \[00:15:00.000]/i,
        ),
      );
    });

    test("should log an error if the first timestamp is equal the second timestamp of the previous iteration", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(vi.fn());
      const newTimestamp = `${createTimestamp(inputVideo)}\n00:19:00.000 00:20:00.000`;
      setup(inputVideo, newTimestamp);
      const readStream = readTimestamps();

      await expect(getMainArgs(readStream)).rejects.toThrow(
        /timestamp errors/i,
      );
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(
          /(?=.*duplicate)(?=.*line 6 and line 7)(?=.*00:19:00.000)/is,
        ),
      );
    });

    test("should have adjusted values if offset > 0", async () => {
      vi.spyOn(FFMPEG_OPTIONS, "OFFSET", "get").mockReturnValue(5);
      const readStream = readTimestamps();
      const output = [
        ["00:00:05.000", "00:01:05.000"],
        ["00:02:05.000", "00:04:05.000"],
        ["00:05:05.000", "00:08:05.000"],
      ];

      const res = await getMainArgs(readStream);

      expect(res).toHaveLength(1);
      expect(res[0]?.timestampPairs).toEqual(expect.arrayContaining(output));
    });

    test("should throw with invalid input", async () => {
      setup("input.exe");
      const readStream = readTimestamps();

      // use 's' flag if patterns are on different lines
      await expect(getMainArgs(readStream)).rejects.toThrow(
        /(?=.*exe.+ at line 1)(?=.*Only the following extensions are valid)/is,
      );
    });

    test("should throw if input video doesn't exist", async () => {
      fs.rmSync(inputVideo);
      const readStream = readTimestamps();

      await expect(getMainArgs(readStream)).rejects.toThrow();
    });

    test("should throw with invalid input video characters", async () => {
      const invalidChars = [
        "`",
        "~",
        "!",
        "@",
        "#",
        "$",
        "%",
        "^",
        "&",
        "*",
        "(",
        ")",
        "=",
        "[",
        "]",
        "{",
        "}",
        "\\",
        "|",
        ";",
        ":",
        "'",
        '"',
        "<",
        ">",
        "?",
      ];

      for (const char of invalidChars) {
        setup(`inputShouldHaveNo${char}.mp4`);
        const readStream = readTimestamps();
        await expect(getMainArgs(readStream)).rejects.toThrow(
          /(?=.*special characters)(?=.*try renaming)(?=.*inputShouldHaveNo.mp4)/is,
        );
      }
    });

    test("should return a new video filename", async () => {
      vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValue(true);
      const oldFilename = "my! invalid@input$.mp4";
      const newFilename = "my invalidinput.mp4";
      setup(oldFilename);
      const readStream = readTimestamps();

      const res = await getMainArgs(readStream);

      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        oldFilename,
        videoFilename: newFilename,
      });
    });
  });
});

describe("secondsToHms", () => {
  test("should convert input to sexagesimal seconds", () => {
    const res = secondsToHms(30);
    expect(res).toBe("00:00:30.000");
  });

  test("should convert input to sexagesimal minutes", () => {
    const res = secondsToHms(120);
    expect(res).toBe("00:02:00.000");
  });

  test("should convert input to sexagesimal hour", () => {
    const res = secondsToHms(3600);
    expect(res).toBe("01:00:00.000");
  });
});

describe("removeIndent", () => {
  test("Should indent the rest of line according the line 2 indentation", () => {
    const timestamp = removeIndent(`input.mp4
        00:00:00.000 00:01:00.000
        00:02:00.000 00:04:00.000
        00:05:00.000 00:08:00.000
        00:09:00.000 00:13:00.000
        00:14:00.000 00:19:00.000`);

    const expectedTimestamp = `input.mp4
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`;

    expect(timestamp).toEqual(expectedTimestamp);
  });
});
