import fs from "fs";
import path from "node:path";

import {createVideoSegment, mergeVideoSegments} from "../services/childProcess.js";
import {
    createSegmentList,
    createTimestampCopy,
    removeOutputIfExists, removeSegmentList,
    removeVideoSegments
} from "../repositories/filesystem.js";
import {
    createFFmpegScripts,
    getVideoSegmentRegExp,
    greenText, listPossibleErrors,
    outputFilenameFormatter,
    sexagesimalFormat
} from "../utils/formatter.js";
import {checkVideoDurationErrors} from "../utils/validator.js";
import {APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS} from "../config.js";

import type {FFmpegArguments, MainArgs} from "../types/index.js";

export const main = (args: MainArgs) => {
    const {
        timestampPairs,
        totalTime,
        videoSegmentDurations,
        videoFilename
    } = args;

    const baseName = path.parse(videoFilename).name;
    fs.mkdirSync(baseName, {recursive: true});

    let videoSegments = fs.readdirSync(baseName);
    const ffmpegArgs: FFmpegArguments = {
        input: videoFilename,
        timestampPairs,
        videoSegments
    }
    const ffmpegScripts: string[] = createFFmpegScripts(ffmpegArgs, FFMPEG_OPTIONS)

    console.log("\nExecuting FFmpeg. This may take a while. . .");

    const time1 = Date.now();
    ffmpegScripts.forEach((script) => {
        console.log("\n" + script);
        createVideoSegment(script, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS);
    });
    const elapsedTime = (Date.now() - time1) / 1000;

    // List the files in the current directory again and filter it with video files of the format 'fileName_XYZ.extensionName'
    // where XYZ is the number of the video, i.e., fileName_001.mp4.
    const videoSegmentRegExp = getVideoSegmentRegExp(baseName, FILENAME_OPTIONS.EXTENSION_NAME);
    videoSegments = fs
        .readdirSync(baseName)
        .filter((file) => videoSegmentRegExp.test(file));

    // Check the duration of each video segment and if the computed duration is almost equal to the actual duration.
    const possibleErrors = checkVideoDurationErrors(videoSegments, videoSegmentDurations, baseName);

    if (possibleErrors.length > 0) {
        console.error(listPossibleErrors(possibleErrors));

        if (!APP_OPTIONS.IGNORE_ERRORS) {
            console.log("\nAbort merging of video segments. . .");
            return;
        }
    }

    createSegmentList(videoSegments, baseName);

    const outputFile = outputFilenameFormatter(baseName);

    removeOutputIfExists(outputFile)

    console.log("\nMerging video segments. . .");

    mergeVideoSegments(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, outputFile, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS)

    console.log(`\n${greenText(outputFile)} has been created.`);

    removeSegmentList();

    removeVideoSegments(baseName);

    createTimestampCopy(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, baseName);

    let sexagesimal = sexagesimalFormat(totalTime);

    console.log(`
Video trimmer has finished. Video output should be about ${sexagesimal} long. 
Total processing time: ${sexagesimalFormat(elapsedTime)}
`
    );

    console.log('='.repeat(process.stdout.columns));
};