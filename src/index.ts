import fs from "fs";
import readline from "readline";
import {execSync} from "child_process";

import * as config from "./utils/config.js";
import * as validator from "./utils/validator.js";
import * as formatter from "./utils/formatter.js";
import * as timestamp from "./utils/timestamp.js";
import * as filesystem from "./repositories/filesystem.js";
import {getVideoDuration} from "./services/childProcess.js";

import type {FFmpegArguments, MergeOptions} from "./types/index.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

if (config.offset !== 0) {
    console.log("\x1b[35m%s\x1b[0m", `Offset Value: ${config.offset} seconds`);
}

const main = (answer: string) => {
    let ts = filesystem.readTimestamps();
    const timestampArr = ts.split("\n").map((ts) => ts.trim());

    console.log("\nProcessing timestamps. . .")
    const result = timestamp.processTimestamps(timestampArr);
    const {totalTime, videoSegmentDurations} = result;
    let {arr} = result;

    // Remove the name of the file from the array.
    const videoFile = arr.shift();
    if (videoFile === undefined) throw new Error(
        formatter.errorMsgFormatter("Video filename was not found. The processed array is empty.")
    )

    console.log("\nChecking video file. . .")

    filesystem.checkVideoFile(videoFile);
    validator.checkFileExtension(videoFile);

    /*
    Split the strings inside the array by whitespaces.
    The result would be in form: [[timestamp1,timestamp2],[timestamp3,timestamp4],etc]
    */
    let tsSplit = arr.map((ts) => {
        let tsArr = ts.split(/\s/);

        if (config.offset !== 0) {
            tsArr = tsArr.map((singleTs) => {
                let tsInSeconds = formatter.sexagesimalToSeconds(singleTs);
                return formatter.sexagesimalFormat(tsInSeconds + config.offset);
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
        tsArray: tsSplit,
        dir: videoSegments
    }
    let ffmpegScripts: string[] = formatter.generateFFmpegScripts(ffmpegArgs, config)

    console.log("\nExecuting FFmpeg. This may take a while. . .");

    let time1 = Date.now();
    ffmpegScripts.forEach((script) => {
        console.log("\n" + script);
        execSync(script, config.execSyncOptions);
    });
    let time2 = Date.now();

    // List the files in the current directory again and filter it with video files of the format 'fileName_XYZ.extensionName'
    // where XYZ is the number of the video, i.e., fileName_001.mp4.
    const videoSegmentRegExp = formatter.getVideoSegmentRegExp(nameOnly, config.extensionName);
    videoSegments = fs
        .readdirSync(baseOutputPath)
        .filter((file) => videoSegmentRegExp.test(file));

    // Check the duration of each video segments and if the computed duration is almost equal to the actual duration.
    console.log("\nChecking each video segment's length. . .");
    let possibleErrors = videoSegments.reduce((acc, file, index) => {
        const durationInSeconds = getVideoDuration(baseOutputPath, file);

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
        nameOnly,
        baseOutputPath,
        isVideoSegmentKept: answer,
        totalTime,
        timeDiff: time2 - time1,
    }

    if (!config.isBatch && possibleErrors.length > 0) {
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
                    filesystem.mergeVideos(mergeVideosArgs);
                    return rl.close();
                }
            }
        );
    } else {
        console.log("\nNo problems were found with the video segments.");
        filesystem.mergeVideos(mergeVideosArgs);
        return rl.close();
    }
};

rl.question(
    "\nKeep all video segments? (Default: yes) | [yes|no]: ",
    async isVideoSegmentKept => {
        try {
            if (config.isBatch) {
                let ts = ""
                ts += fs.readFileSync(config.batchInput);
                const tsList = ts.split(config.batchSeparator)
                    .map(string => string.trim())

                for (const timestamp of tsList) {
                    fs.writeFileSync(config.timestampsFilename, timestamp);
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