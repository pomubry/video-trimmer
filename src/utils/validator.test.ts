import { describe, expect, test, vi } from "vitest";

import * as fileSystem from "../system/filesystem.js";
import { getVideoDuration } from "../system/childProcess.js";
import { checkFileSizeDiff, checkVideoDurationErrors } from "./validator.js";

describe("checkVideoDurationErrors", () => {
  const spy = vi.fn();
  const baseName = "randomVideo";
  const videoSegments = new Array(5)
    .fill(0)
    .map((_, i) => `${baseName}_${(i + 1).toString()}.mp4`);

  test("should return empty array if no large disparity in duration was found", () => {
    const videoDuration = [0, 0, 0, 0, 0];
    vi.mocked(getVideoDuration).mockReturnValue(0);
    vi.spyOn(console, "log").mockImplementation(vi.fn());

    const possibleErrors = checkVideoDurationErrors(
      videoSegments,
      videoDuration,
      baseName,
      spy,
    );

    expect(possibleErrors).toHaveLength(0);
  });

  test("should return 2 errors", () => {
    const videoDuration = [1, 4, 5, 6, 10];
    vi.mocked(getVideoDuration).mockReturnValue(5);
    vi.spyOn(console, "log").mockImplementation(vi.fn());

    const possibleErrors = checkVideoDurationErrors(
      videoSegments,
      videoDuration,
      baseName,
      spy,
    );

    expect(possibleErrors).toHaveLength(2);
  });

  test("should log 3 okay and 2 errors", () => {
    const spyLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
    vi.mocked(getVideoDuration).mockReturnValue(5);
    const videoDuration = [1, 4, 5, 6, 10];

    checkVideoDurationErrors(videoSegments, videoDuration, baseName, spy);

    const okayString = expect.stringMatching(/okay/i) as string;
    const errorString = expect.stringMatching(/error/i) as string;
    videoDuration.forEach((_, idx) => {
      const nth = idx + 1;
      switch (nth) {
        case 1:
        case 5:
          expect(spyLog).toHaveBeenNthCalledWith(nth, errorString);
          break;
        default:
          expect(spyLog).toHaveBeenNthCalledWith(nth, okayString);
          break;
      }
    });
  });
});

describe("getFileSizeDiff", () => {
  test("should return the amount of storage saved in MB", () => {
    const spy = vi.fn();
    const oldSize = 50000;
    const newSize = 10000;
    vi.spyOn(fileSystem, "getFileSize")
      .mockReturnValueOnce(oldSize)
      .mockReturnValueOnce(newSize);

    const res = checkFileSizeDiff("a", "b", spy);

    expect(res).toMatch(/saved .+\d+.+ mb/i);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  test(`should add an error to EndErrorLogger`, () => {
    const spy = vi.fn();
    vi.spyOn(fileSystem, "getFileSize")
      .mockReturnValueOnce(10000)
      .mockReturnValueOnce(50000);
    const expectedRegex = /bigger than the original/gi;

    const res = checkFileSizeDiff("a", "b", spy);

    expect(res).toMatch(expectedRegex);
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(expectedRegex));
  });
});
