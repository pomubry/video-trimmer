import fs from "node:fs";
import path from "node:path";

import {
  createVideoSegment,
  mergeVideoSegments,
} from "../system/childProcess.js";
import {
  createSegmentList,
  createTimestampCopy,
  removeOutputIfExists,
  removeSegmentList,
  removeVideoSegments,
} from "../system/filesystem.js";
import {
  createFfmpegArgs,
  getVideoSegmentRegExp,
  greenText,
  outputFilenameFormatter,
} from "../utils/formatter.js";
import {
  checkFileSizeDiff,
  checkVideoDurationErrors,
} from "../utils/validator.js";
import { secondsToHms } from "../utils/timestamp.js";
import { APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import type { AddError, FFmpegArguments, MainArg } from "../types/index.js";

function getTimestamp(mainArg: MainArg) {
  const timestamp = mainArg.timestampPairs.reduce((acc, cur) => {
    const tsLine = "\n" + cur.join(" ");
    return acc + tsLine;
  }, "");

  return mainArg.videoFilename + timestamp;
}

function getTotalTime(mainArg: MainArg) {
  return mainArg.videoSegmentDurations.reduce((acc, cur) => acc + cur, 0);
}

export function main(args: MainArg, addError: AddError) {
  const { timestampPairs, videoSegmentDurations, videoFilename } = args;

  const baseName = path.parse(videoFilename).name;
  fs.mkdirSync(baseName, { recursive: true });

  let videoSegments = fs.readdirSync(baseName);
  const ffmpegArgs: FFmpegArguments = {
    input: videoFilename,
    timestampPairs,
    videoSegments,
  };
  const ffmpegScripts = createFfmpegArgs(ffmpegArgs, FFMPEG_OPTIONS);

  console.log("\nExecuting FFmpeg. This may take a while. . .");

  const time1 = Date.now();
  ffmpegScripts.forEach((script) => {
    console.log(["\nffmpeg", ...script].join(" "));
    createVideoSegment(script, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS);
  });
  const elapsedTime = (Date.now() - time1) / 1000;

  // List the files in the current directory again and filter it with video files of the format 'fileName_XYZ.extensionName'
  // where XYZ is the number of the video, i.e., fileName_001.mp4.
  const videoSegmentRegExp = getVideoSegmentRegExp(
    baseName,
    FILENAME_OPTIONS.EXTENSION_NAME,
  );
  videoSegments = fs
    .readdirSync(baseName)
    .filter((file) => videoSegmentRegExp.test(file));

  // Check the duration of each video segment and if the computed duration is almost equal to the actual duration.
  const possibleErrors = checkVideoDurationErrors(
    videoSegments,
    videoSegmentDurations,
    baseName,
    addError,
  );

  if (possibleErrors.length > 0 && !APP_OPTIONS.IGNORE_ERRORS) {
    console.log("\nAbort merging of video segments. . .");
    return;
  }

  createSegmentList(videoSegments, baseName);

  const outputFile = outputFilenameFormatter(baseName);

  removeOutputIfExists(outputFile);

  console.log("\nMerging video segments. . .");

  mergeVideoSegments(
    FILENAME_OPTIONS.SEGMENT_LIST_FILENAME,
    outputFile,
    FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS,
  );

  console.log(`\n${greenText(outputFile)} has been created.`);

  removeSegmentList();

  if (!APP_OPTIONS.KEEP_VIDEO_SEGMENTS) {
    removeVideoSegments(baseName);
  }

  if (APP_OPTIONS.KEEP_TIMESTAMP_COPY) {
    const timestamp = getTimestamp(args);
    createTimestampCopy(baseName, timestamp);
  }

  const totalTime = getTotalTime(args);
  const hms = secondsToHms(totalTime);
  const fileSizeDiff = checkFileSizeDiff(videoFilename, outputFile, addError);

  console.log(`
DONE! Video output should be about ${hms} long. 
Total processing time: ${secondsToHms(elapsedTime)}
${fileSizeDiff}
`);

  console.log("=".repeat(process.stdout.columns));
}
