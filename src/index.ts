import fs from "fs";
import readline from "readline";
import {execSync} from "child_process";

import {offset, execSyncOptions, isBatch, tsInput, batchSeparator, batchInput} from "./lib/config.js";
import {checkVideoFile, getVideoSegmentErrors, mergeVideos} from "./utils/filesystem.js";
import {
    generateFFmpegScripts,
    sexagesimalFormat,
    sexagesimalToSeconds,
    getVideoSegmentRegExp, errorMsgFormatter
} from "./utils/formatter.js";
import {processTimestamps, readTimestamps} from "./lib/timestamp.js";

import type {FFmpegArguments, MergeOptions} from "./types/index.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

if (offset !== 0) {
    console.log("\x1b[35m%s\x1b[0m", `Offset Value: ${offset} seconds`);
}

const main = (answer: string) => {
    let ts = readTimestamps();
    const timestampArr = ts.split("\n").map((ts) => ts.trim());

    console.log("\nProcessing timestamps. . .")
    const result = processTimestamps(timestampArr);
    const {totalTime, videoSegmentDurations} = result;
    let {arr} = result;

    // Remove the name of the file from the array.
    const videoFile = arr.shift();
    if (videoFile === undefined) throw new Error(
        errorMsgFormatter("Video filename was not found. The processed array is empty.")
    )

    console.log("\nChecking video file. . .")
    checkVideoFile(videoFile);

    /*
    Split the strings inside the array by whitespaces.
    The result would be in form: [[timestamp1,timestamp2],[timestamp3,timestamp4],etc]
    */
    let tsSplit = arr.map((ts) => {
        let tsArr = ts.split(/\s/);

        if (offset !== 0) {
            tsArr = tsArr.map((singleTs) => {
                let tsInSeconds = sexagesimalToSeconds(singleTs);
                return sexagesimalFormat(tsInSeconds + offset);
            });
        }

        return tsArr;
    });

    const nameOnly = videoFile.slice(0, videoFile.lastIndexOf("."));
    if (!fs.readdirSync(".").includes(nameOnly)) {
        fs.mkdirSync(nameOnly);
    }

    let baseOutputPath = "./" + nameOnly;
    let videoSegments = fs.readdirSync(baseOutputPath);
    const ffmpegArgs: FFmpegArguments = {
        input: videoFile,
        output: nameOnly,
        tsArray: tsSplit,
        path: baseOutputPath,
        dir: videoSegments
    }
    let ffmpegScripts: string[] = generateFFmpegScripts(ffmpegArgs)

    console.log("\nExecuting FFmpeg. This may take a while. . .");

    let time1 = Date.now();
    ffmpegScripts.forEach((script) => {
        console.log("\n" + script);
        execSync(script, execSyncOptions);
    });
    let time2 = Date.now();

    // List the files in the current directory again and filter it with video files of the format 'fileName_XYZ.extensionName'
    // where XYZ is the number of the video, i.e., fileName_001.mp4.
    const videoSegmentRegExp = getVideoSegmentRegExp(nameOnly);
    videoSegments = fs
        .readdirSync(baseOutputPath)
        .filter((file) => videoSegmentRegExp.test(file));

    // Check the duration of each video segments and if the computed duration is almost equal to the actual duration.
    console.log("\nChecking each video segment's length. . .");
    let possibleErrors = getVideoSegmentErrors(videoSegments, videoSegmentDurations, baseOutputPath);

    const mergeVideosArgs: MergeOptions = {
        videoSegments,
        nameOnly,
        baseOutputPath,
        isVideoSegmentKept: answer,
        totalTime,
        timeDiff: time2 - time1,
    }

    if (!isBatch && possibleErrors.length > 0) {
        console.error(`
Please check the following files for possible errors:

${possibleErrors.map(err => "\t" + err).join("\n")}

Note that small disparities are normal and you may continue if you have not found an error in any video segments.`
        )

        rl.question(
            "\nAbort merging videos? (Default: no) | [yes|no]: ",
            function (abort) {
                if (abort.toLocaleLowerCase() === "yes") {
                    console.log("\nAbort merging of video segments. . .");
                    return rl.close();
                } else {
                    mergeVideos(mergeVideosArgs);
                    return rl.close();
                }
            }
        );
    } else {
        console.log("\nNo problems were found with the video segments.");
        mergeVideos(mergeVideosArgs);
        return rl.close();
    }
};

rl.question(
    "\nKeep all video segments? (Default: yes) | [yes|no]: ",
    async isVideoSegmentKept => {
        try {
            if (isBatch) {
                let ts = ""
                ts += fs.readFileSync(batchInput);
                const tsList = ts.split(batchSeparator)
                    .map(string => string.trim())

                for (const timestamp of tsList) {
                    fs.writeFileSync(tsInput, timestamp);
                    main(isVideoSegmentKept.toLocaleLowerCase());
                }
            } else {
                main(isVideoSegmentKept.toLocaleLowerCase())
            }

        } catch (e) {
            console.log(`
= = = = = = = = = = H I N T S : = = = = = = = = = =

* Line 1 should be the video filename including its extension. 
    Example: input.mp4.

* Timestamp format for each line (except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space inbetween.
    Example: 10:00:00.123456789 11:00:00.123456789

* Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. 
    Example: 12:34:56.123456789

* Don't leave any empty lines.
`
            )
            console.error(e);
        }
        rl.close();
    }
);

//TODO create regex for special characters in input filename
//TODO loop multiple vids.txt