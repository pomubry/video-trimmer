import fs from "node:fs";
import path from "node:path";

import { blueText, redText, errorMsgFormatter } from "../utils/formatter.js";
import { APP_OPTIONS, FILENAME_OPTIONS } from "../config.js";

export function readTimestamps() {
  try {
    return fs.readFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
  } catch {
    throw new Error(
      errorMsgFormatter(
        `The file [${redText(FILENAME_OPTIONS.TIMESTAMPS_FILENAME)}] was not found!`,
      ),
    );
  }
}

export function checkVideoFile(videoFile: string) {
  if (!fs.readdirSync(".").includes(videoFile)) {
    throw new Error(
      errorMsgFormatter(
        `[${redText(videoFile)}] was not found. Make sure to put the correct video filename at the top (Line 1) of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`,
      ),
    );
  }
}

export function createSegmentList(videoSegments: string[], basename: string) {
  let myList = "";
  videoSegments.forEach(
    (file, index) =>
      (myList += `${index !== 0 ? "\n" : ""}file '${path.join(basename, file)}'`),
  );
  fs.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, myList);
}

export function removeSegmentList() {
  fs.rmSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME);
}

export function removeOutputIfExists(outputFile: string) {
  if (fs.readdirSync(".").includes(outputFile)) {
    console.log(
      `\nThe file [${blueText(outputFile)}] already exists. Removing file before making a new one. . .`,
    );
    fs.rmSync(outputFile);
  }
}

export function removeVideoSegments(baseName: string) {
  if (!APP_OPTIONS.KEEP_VIDEO_SEGMENTS) {
    fs.rmSync(baseName, { recursive: true, force: true });
  }
}

export function createTimestampCopy(outputFilename: string, content: string) {
  fs.writeFileSync(`${outputFilename}.txt`, content, { encoding: "utf-8" });
}

export function renameFile(timestampArr: string[], newFilename: string) {
  if (timestampArr[0] === undefined)
    throw new Error(
      errorMsgFormatter("Renaming file failed because of empty timestamp."),
    );
  if (timestampArr[0] === newFilename) return;

  fs.renameSync(timestampArr[0], newFilename);
}

export function getFileSize(filename: string) {
  return fs.statSync(filename).size;
}
