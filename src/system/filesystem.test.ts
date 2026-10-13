import readline from "node:readline";
import path from "node:path";
import { vi, describe, test, beforeEach, expect } from "vitest";
import { fs } from "memfs";

import {
  checkVideoFile,
  createSegmentList,
  createTimestampCopy,
  readTimestamps,
  removeOutputIfExists,
  removeSegmentList,
  removeVideoSegments,
  renameFile,
} from "./filesystem.js";
import {
  outputFilenameFormatter,
  removeIndent,
  videoCounter,
} from "../utils/formatter.js";
import { APP_OPTIONS, FILENAME_OPTIONS } from "../config.js";

const baseName = "input";
const videoSegments = new Array(3)
  .fill(0)
  .map(
    (_, i) =>
      `${baseName}_${videoCounter(i + 1)}.${FILENAME_OPTIONS.EXTENSION_NAME}`,
  );
const newTimestampFilename = "otherFile.txt";
const randomText = "some text";

describe("Timestamp reader", () => {
  test("Should read the timestamp file", async () => {
    fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, randomText);
    const res = readTimestamps();

    const rl = readline.createInterface({
      input: res,
      crlfDelay: Infinity, // Recognizes all CR LF variants
    });

    for await (const chunk of rl) {
      expect(chunk).toBe(randomText);
    }
  });

  test("Should read a different file according to config", async () => {
    vi.spyOn(FILENAME_OPTIONS, "TIMESTAMPS_FILENAME", "get").mockReturnValue(
      newTimestampFilename,
    );
    fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, randomText);

    const res = readTimestamps();
    const rl = readline.createInterface({
      input: res,
      crlfDelay: Infinity, // Recognizes all CR LF variants
    });

    expect(FILENAME_OPTIONS.TIMESTAMPS_FILENAME).toBe(newTimestampFilename);
    for await (const chunk of rl) {
      expect(chunk).toBe(randomText);
    }
  });
});

describe("Video File Checker", () => {
  test("Should not throw an error if video is found", () => {
    const videoFile = "input.mp4";
    fs.writeFileSync(videoFile, randomText);
    expect(() => {
      checkVideoFile(videoFile, 1);
    }).not.toThrow();
  });

  test("Should throw an error if video is not found", () => {
    expect(() => {
      checkVideoFile("non-existing-file.mp4", 1);
    }).toThrow(/was not found/i);
  });
});

describe("createSegmentList", () => {
  test("Should create a list of video segments", () => {
    const expectedText =
      removeIndent(`file '${path.join(baseName, `${baseName}_${videoCounter(1)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)}'
        file '${path.join(baseName, `${baseName}_${videoCounter(2)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)}'
        file '${path.join(baseName, `${baseName}_${videoCounter(3)}.${FILENAME_OPTIONS.EXTENSION_NAME}`)}'`);

    createSegmentList(videoSegments, baseName);

    const res = fs.readFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, {
      encoding: "utf-8",
    });
    expect(res).toBe(expectedText);
  });
});

describe("removeSegmentList", () => {
  test("Should remove the segment list file", () => {
    fs.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, randomText);

    removeSegmentList();

    expect(fs.readdirSync(".")).toHaveLength(0);
  });
});

describe("removeOutputIfExists", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(vi.fn());
  });

  test("Should remove the output file if it exists", () => {
    const outputFilename = outputFilenameFormatter(baseName);
    fs.writeFileSync(outputFilename, randomText);

    removeOutputIfExists(outputFilename);

    const res = fs.readdirSync(".");
    expect(res).toHaveLength(0);
  });

  test("Should keep other files", () => {
    const outputFilename = outputFilenameFormatter(baseName);
    fs.writeFileSync(outputFilename, randomText);
    fs.writeFileSync("otherFile.txt", randomText);

    removeOutputIfExists(outputFilename);

    const res = fs.readdirSync(".");
    expect(res).toHaveLength(1);
  });

  test("Should not throw if output file does not exists", () => {
    const outputFilename = outputFilenameFormatter(baseName);

    expect(() => {
      removeOutputIfExists(outputFilename);
    }).not.toThrow();
  });
});

describe("removeVideoSegments", () => {
  beforeEach(() => {
    fs.mkdirSync(baseName);
    videoSegments.forEach((segment) => {
      const file = path.join(baseName, segment);
      fs.writeFileSync(file, randomText);
    });
  });

  test("Should remove the video segments", () => {
    vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(false);

    expect(fs.readdirSync(".")).toHaveLength(1);
    expect(fs.readdirSync(baseName)).toHaveLength(videoSegments.length);

    removeVideoSegments(baseName);

    expect(fs.readdirSync(".")).toHaveLength(0);
  });

  test("Should keep other files", () => {
    vi.spyOn(APP_OPTIONS, "KEEP_VIDEO_SEGMENTS", "get").mockReturnValue(false);
    fs.writeFileSync("otherFile.txt", randomText);

    expect(fs.readdirSync(".")).toHaveLength(2);
    expect(fs.readdirSync(baseName)).toHaveLength(videoSegments.length);

    removeVideoSegments(baseName);

    const res = fs.readdirSync(".");
    expect(res).toHaveLength(1);
  });
});

describe("createTimestampCopy", () => {
  test("Should create a copy of the timestamp", () => {
    createTimestampCopy(baseName, randomText);

    expect(fs.readdirSync(".")).toContain(baseName + ".txt");
  });
});

describe("renameFile", () => {
  test("Should rename a file", () => {
    const oldName = "oldName.txt";
    const newName = "newName.txt";
    fs.writeFileSync(oldName, randomText);

    renameFile(oldName, newName);

    const res = fs.readFileSync(newName, { encoding: "utf-8" });
    expect(res).toBe(randomText);
  });
});
