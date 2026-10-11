import fs from "node:fs";
import path from "node:path";

import { blueText, redText, errorMsgFormatter } from "../utils/formatter.js";
import { FILENAME_OPTIONS } from "../config.js";

export function readTimestamps() {
  return fs.createReadStream(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
}

export function checkVideoFile(videoFile: string, lineNumber: number) {
  if (!fs.readdirSync(".").includes(videoFile)) {
    throw new Error(
      errorMsgFormatter(
        `[${redText(videoFile)}] was not found. Make sure to put the correct video filename at line ${lineNumber.toString()} of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`,
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
  fs.rmSync(baseName, { recursive: true, force: true });
}

export function createTimestampCopy(outputFilename: string, content: string) {
  fs.writeFileSync(`${outputFilename}.txt`, content, { encoding: "utf-8" });
}

export function renameFile(oldFilename: string, newFilename: string) {
  fs.renameSync(oldFilename, newFilename);
}

export function getFileSize(filename: string) {
  return fs.statSync(filename).size;
}
