import fs from "fs";
import path from "node:path";

import * as childProcess from "./services/childProcess.js";
import * as filesystem from "./repositories/filesystem.js";
import * as timestamp from "./utils/timestamp.js";
import * as formatter from "./utils/formatter.js";
import * as validator from "./utils/validator.js";
import {APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS} from "./config.js";

import type {Interface} from "node:readline";
import type {FFmpegArguments, MergeOptions} from "./types/index.js";

export const main = (readlineInterface: Pick<Interface, "close">) => {
    const ts = filesystem.readTimestamps();
    const timestampArr = ts.split("\n").map((ts) => ts.trim());

    console.log("\nProcessing timestamps. . .")
    const {
        timestampPairs,
        totalTime,
        videoSegmentDurations,
        videoFilename
    } = timestamp.processTimestamps(timestampArr);

    console.log("\nChecking video file. . .")

    validator.checkFileExtension(videoFilename);
    validator.checkVideoFilename(videoFilename);
    filesystem.checkVideoFile(videoFilename);

    const baseName = path.parse(videoFilename).name;
    fs.mkdirSync(baseName, {recursive: true});

    let videoSegments = fs.readdirSync(baseName);
    const ffmpegArgs: FFmpegArguments = {
        input: videoFilename,
        timestampPairs,
        videoSegments
    }
    const ffmpegScripts: string[] = formatter.createFFmpegScripts(ffmpegArgs, FFMPEG_OPTIONS)

    console.log("\nExecuting FFmpeg. This may take a while. . .");

    const time1 = Date.now();
    ffmpegScripts.forEach((script) => {
        console.log("\n" + script);
        childProcess.createVideoSegment(script, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS);
    });
    const elapsedTime = Date.now() - time1;

    // List the files in the current directory again and filter it with video files of the format 'fileName_XYZ.extensionName'
    // where XYZ is the number of the video, i.e., fileName_001.mp4.
    const videoSegmentRegExp = formatter.getVideoSegmentRegExp(baseName, FILENAME_OPTIONS.EXTENSION_NAME);
    videoSegments = fs
        .readdirSync(baseName)
        .filter((file) => videoSegmentRegExp.test(file));

    // Check the duration of each video segment and if the computed duration is almost equal to the actual duration.
    console.log("\nChecking each video segment's length. . .");
    const possibleErrors = validator.checkVideoDurationErrors(videoSegments, videoSegmentDurations, baseName);

    if (!APP_OPTIONS.IS_BATCH && possibleErrors.length > 0) {
        console.error(formatter.listPossibleErrors(possibleErrors));

        if (!APP_OPTIONS.IGNORE_ERRORS) {
            console.log("\nAbort merging of video segments. . .");
            return readlineInterface.close();
        }
    } else {
        console.log("\nNo problems were found with the video segments.");
    }

    const mergeVideosArgs: MergeOptions = {
        videoSegments,
        basename: baseName,
        videoDuration: totalTime,
        elapsedTime,
    }

    filesystem.mergeVideos(mergeVideosArgs);
    return readlineInterface.close();
};