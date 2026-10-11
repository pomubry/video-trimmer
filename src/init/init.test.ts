import path from "node:path";
import { fs } from "memfs";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as childProcess from "../system/childProcess.js";
import * as filesystem from "../system/filesystem.js";
import { init } from "./init.js";
import { outputFilenameFormatter } from "../utils/formatter.js";
import { APP_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import { EndErrorLogger } from "../utils/errors/endErrorLogger.js";
import { UnexpectedError } from "../utils/errors/unexpectedError.js";

const baseName = "segment";

function createTimestamp(videoFilename: string) {
  // Each timestamp duration is increased by 60 seconds
  return `${videoFilename}
00:00:00.000 00:01:00.000
00:02:00.000 00:04:00.000
00:05:00.000 00:08:00.000
00:09:00.000 00:13:00.000
00:14:00.000 00:19:00.000`;
}

function setupInputFiles(timestamp: string, videoFilename: string) {
  fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestamp, {
    encoding: "utf-8",
  });
  fs.writeFileSync(videoFilename, "random");
}

describe("init function", () => {
  let endErrorLogger: EndErrorLogger;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(vi.fn());
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    endErrorLogger = new EndErrorLogger();
  });

  function mockVideoDuration(mockError = false) {
    // Array values are based on the return value of `createTimestamp`
    [60, 120, 180, 240, 300].forEach((_, tsIndex) => {
      const value =
        mockError && tsIndex + 1 === 5
          ? (tsIndex + 1) * 60 - 5
          : (tsIndex + 1) * 60;
      vi.spyOn(childProcess, "getVideoDuration").mockReturnValueOnce(value);
    });
  }

  function mockGetFileSize(mockError = false) {
    vi.spyOn(filesystem, "getFileSize")
      .mockReturnValueOnce(5000 * 5000)
      .mockReturnValueOnce(mockError ? 6000 * 6000 : 2000 * 2000);
  }

  describe("in single operation", () => {
    const videoFilename = `${baseName}1.mp4`;
    const singleTimestamp = createTimestamp(videoFilename);

    test("should auto rename input and timestamp", async () => {
      vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValueOnce(true);
      mockVideoDuration();

      const oldFilename = "input! video@.mp4";
      const newFilename = "input video.mp4";
      const singleTimestamp = createTimestamp(oldFilename);

      setupInputFiles(singleTimestamp, oldFilename);

      await init(endErrorLogger);

      const files = fs.readdirSync(".");
      expect(files).toContain(newFilename);
      expect(files).toContain(path.parse(newFilename).name + ".txt");
    });

    test("should throw error if AUTO_RENAME is false (default)", async () => {
      const oldFilename = "input! video@.mp4";
      const singleTimestamp = createTimestamp(oldFilename);

      setupInputFiles(singleTimestamp, oldFilename);

      await expect(init(endErrorLogger)).rejects.toThrow(
        /(?=.*special characters)(?=.*try renaming)/is,
      );
    });

    test("should log video duration error", async () => {
      const spyError = vi.spyOn(console, "error").mockImplementation(vi.fn());
      setupInputFiles(singleTimestamp, videoFilename);
      mockGetFileSize();
      mockVideoDuration(true);

      await init(endErrorLogger);

      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyError).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/possible error/gi),
      );
    });

    test("should log file size error", async () => {
      const spyError = vi.spyOn(console, "error").mockImplementation(vi.fn());
      setupInputFiles(singleTimestamp, videoFilename);
      mockGetFileSize(true);
      mockVideoDuration();

      await init(endErrorLogger);

      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyError).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/file size/gi),
      );
    });

    describe("auto suspend function", () => {
      async function normalRun() {
        setupInputFiles(singleTimestamp, videoFilename);
        mockGetFileSize();
        mockVideoDuration();

        await init(endErrorLogger);
      }

      test("should suspend when AUTO_SUSPEND is true", async () => {
        vi.spyOn(APP_OPTIONS, "AUTO_SUSPEND", "get").mockReturnValueOnce(true);
        const spySuspend = vi.spyOn(childProcess, "suspendSystem");

        await normalRun();

        expect(spySuspend).toHaveBeenCalledTimes(1);
      });

      test("should not suspend when AUTO_SUSPEND is false", async () => {
        vi.spyOn(APP_OPTIONS, "AUTO_SUSPEND", "get").mockReturnValueOnce(false);
        const spySuspend = vi.spyOn(childProcess, "suspendSystem");

        await normalRun();

        expect(spySuspend).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("in batch operation", () => {
    function createBatchTimestamp(invalidVideoFilename?: string) {
      interface BatchType {
        timestampArr: string[];
        filenames: string[];
      }

      const batch = new Array(3).fill(null).reduce<BatchType>(
        (acc, _, i) => {
          let filename = `${baseName}${(i + 1).toString()}.mp4`;
          if (invalidVideoFilename !== undefined && i + 1 === 2) {
            filename = invalidVideoFilename;
          }

          const timestamp = createTimestamp(filename);
          acc.timestampArr.push(timestamp);
          acc.filenames.push(filename);

          return acc;
        },
        { timestampArr: [], filenames: [] },
      );

      const batchTimestamp = batch.timestampArr.join("\n");
      return { batchTimestamp, filenames: batch.filenames };
    }

    test("should auto rename input and timestamp", async () => {
      vi.spyOn(APP_OPTIONS, "AUTO_RENAME", "get").mockReturnValueOnce(true);

      const oldFilename = "input! video@.mp4";
      const { batchTimestamp, filenames } = createBatchTimestamp(oldFilename);

      filenames.forEach((filename) => {
        mockVideoDuration();
        setupInputFiles(batchTimestamp, filename);
      });

      await init(endErrorLogger);

      const files = fs.readdirSync(".");
      const expectedFiles = new Array(3)
        .fill(null)
        .reduce<string[]>((acc, _, i) => {
          const filename = i + 1 === 2 ? "input video.mp4" : filenames[i];
          if (filename === undefined)
            throw new UnexpectedError("Filename is undefined");

          const basename = path.parse(filename).name;
          const timestampCopy = basename + ".txt";
          const output = outputFilenameFormatter(basename);
          return [...acc, basename, filename, timestampCopy, output];
        }, []);

      expectedFiles.forEach((file) => {
        expect(files).toContain(file);
      });
    });

    test("should throw error if AUTO_RENAME is false (default)", async () => {
      const oldFilename = "input! video@.mp4";
      const { batchTimestamp, filenames } = createBatchTimestamp(oldFilename);

      filenames.forEach((filename) => {
        setupInputFiles(batchTimestamp, filename);
      });

      await expect(init(endErrorLogger)).rejects.toThrow(
        /(?=.*special characters)(?=.*try renaming)/is,
      );
    });

    test("should log video duration error", async () => {
      const spyError = vi.spyOn(console, "error").mockImplementation(vi.fn());
      const { batchTimestamp, filenames } = createBatchTimestamp();

      filenames.forEach((filename) => {
        setupInputFiles(batchTimestamp, filename);
        mockGetFileSize();
        mockVideoDuration(true);
      });

      await init(endErrorLogger);

      expect(spyError).toHaveBeenCalledTimes(3);
      expect(spyError).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/possible error/gi),
      );
    });

    test("should log file size error", async () => {
      const spyError = vi.spyOn(console, "error").mockImplementation(vi.fn());
      const { batchTimestamp, filenames } = createBatchTimestamp();

      filenames.forEach((filename) => {
        setupInputFiles(batchTimestamp, filename);
        mockGetFileSize(true);
        mockVideoDuration();
      });

      await init(endErrorLogger);

      expect(spyError).toHaveBeenCalledTimes(3);
      expect(spyError).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/file size/gi),
      );
    });

    describe("auto suspend function", () => {
      async function normalBatchRun() {
        const { batchTimestamp, filenames } = createBatchTimestamp();

        filenames.forEach((filename) => {
          setupInputFiles(batchTimestamp, filename);
          mockGetFileSize();
          mockVideoDuration();
        });

        await init(endErrorLogger);
      }

      test("should suspend when AUTO_SUSPEND is true", async () => {
        vi.spyOn(APP_OPTIONS, "AUTO_SUSPEND", "get").mockReturnValueOnce(true);
        const spySuspend = vi.spyOn(childProcess, "suspendSystem");

        await normalBatchRun();

        expect(spySuspend).toHaveBeenCalledTimes(1);
      });

      test("should not suspend when AUTO_SUSPEND is false", async () => {
        vi.spyOn(APP_OPTIONS, "AUTO_SUSPEND", "get").mockReturnValueOnce(false);
        const spySuspend = vi.spyOn(childProcess, "suspendSystem");

        await normalBatchRun();

        expect(spySuspend).toHaveBeenCalledTimes(0);
      });
    });
  });
});
