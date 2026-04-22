import fs from "fs";
import path from "node:path";

import * as childProcess from "./services/childProcess.js";
import * as filesystem from "./repositories/filesystem.js";
import * as timestamp from "./utils/timestamp.js";
import * as formatter from "./utils/formatter.js";
import * as validator from "./utils/validator.js";
import {APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS} from "./config.js";
import {readlineMerge, readlineQA} from "./services/readline.js";

import type {
    FFmpegArguments,
    MergeOptions,
    ReadlineCloseCallback,
    ReadlineMergeCallback,
} from "./types/index.js";

const readlineMergeCallback: ReadlineMergeCallback = (answer, mergeOptions, readlineInterface) => {
    if (answer.toLocaleLowerCase() === "yes") {
        console.log("\nAbort merging of video segments. . .");
        return readlineInterface.close();
    } else {
        filesystem.mergeVideos(mergeOptions);
        return readlineInterface.close();
    }
}

export const main = (answer: string, readlineInterface: ReadlineCloseCallback) => {
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
    let possibleErrors = videoSegments.reduce((acc, file, index) => {
        const durationInSeconds = childProcess.getVideoDuration(baseName, file);

        if (videoSegmentDurations[index] === undefined) {
            throw new Error(
                formatter.errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
            )
        }

        let difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
        let isGreaterThanOne = Number(difference) > 1;

        console.log(`\n[\x1b[94m${file}\x1b[0m] Duration: Computed (${(
                videoSegmentDurations[index]
            )}) vs Actual (${(
                durationInSeconds
            )}). Difference: ${difference} seconds.${
                isGreaterThanOne
                    ? "\x1b[31m Possible Error!\x1b[0m"
                    : "\x1b[32m Result Okay!\x1b[0m"
            }`
        );

        if (isGreaterThanOne) {
            return [...acc, file]
        }

        return acc
    }, [] as string[]);

    const mergeVideosArgs: MergeOptions = {
        videoSegments,
        basename: baseName,
        isVideoSegmentKept: answer,
        videoDuration: totalTime,
        elapsedTime,
    }

    if (!APP_OPTIONS.IS_BATCH && possibleErrors.length > 0) {
        console.error(`
Please check the following files for possible errors:

${possibleErrors.map(err => "\t" + err).join("\n")}

Note that small disparities are normal and you may continue if you have not found an error in any video segments.`
        )

        readlineMerge(
            readlineQA,
            mergeVideosArgs,
            readlineMergeCallback
        )
    } else {
        console.log("\nNo problems were found with the video segments.");
        filesystem.mergeVideos(mergeVideosArgs);
        return readlineInterface.close();
    }
};