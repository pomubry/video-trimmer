import fs from "fs";
import path from "node:path";
import {execSync} from "child_process";

import {execSyncOptions, extensionName, segmentListFilename, supportedExtensions, tsInput} from "../lib/config.js";
import {errorMsgFormatter, sexagesimalFormat} from "./formatter.js";

import type {MergeOptions, RemoveVideoSegmentArguments} from "../types/index.js";

export const createTimestampCopy = (filename: string) => {
    fs.copyFileSync(`./${tsInput}`, `./${filename}.txt`);
};

// Check if the video specified is present in the current directory.
export const checkVideoFile = (videoFile: string) => {
    if (!fs.readdirSync(".").includes(videoFile)) {
        throw new Error(
            errorMsgFormatter(`${videoFile} was not found. Make sure to put the correct video filename at the top (Line 1) of ${tsInput}.`)
        );
    }

    checkFileExtension(videoFile)
}

const checkFileExtension = (videoFile: string) => {
    const extensionName = path.extname(videoFile).toLowerCase().slice(1);
    const extensionError = supportedExtensions.indexOf(extensionName);

    if (extensionError === -1) {
        throw new Error(
            errorMsgFormatter(`The video format ${extensionName} is not supported.
Only the following extensions are valid:
    ${supportedExtensions}`)
        )
    }
}

export const getVideoSegmentErrors = (videoSegments: string[], videoSegmentDurations: number[], baseOutputPath: string) => {
    let possibleErrors: string[] = [];

    videoSegments.forEach((file, index) => {
        let durationInSeconds = Number(
            execSync(
                `ffprobe -v warning -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${baseOutputPath}/${file}"`
            ).toString()
        );

        if (videoSegmentDurations[index] === undefined) {
            throw new Error(
                errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
            )
        }

        let difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
        let isGreaterThanOne = Number(difference) > 1;

        if (isGreaterThanOne) {
            possibleErrors.push(file);
        }

        console.log(`\n[\x1b[94m${file}\x1b[0m] Duration: Computed (${sexagesimalFormat(
                videoSegmentDurations[index]
            )}) vs Actual (${sexagesimalFormat(
                durationInSeconds
            )}). Difference: ${difference} seconds.${
                isGreaterThanOne
                    ? "\x1b[31m Possible Error!\x1b[0m"
                    : "\x1b[32m Result Okay!\x1b[0m"
            }`
        );
    });

    return possibleErrors
}

const createSegmentList = (videoSegments: string[], baseOutputPath: string) => {
    let myList = "";
    videoSegments.forEach(
        (file, index) =>
            (myList += `${index !== 0 ? "\n" : ""}file '${baseOutputPath}/${file}'`)
    );
    fs.writeFileSync(segmentListFilename, myList);

    console.log(`\n${segmentListFilename} has been created temporarily. . .`);
}

const removeVideoSegments = (
    {isVideoSegmentKept, nameOnly, baseOutputPath, videoSegments}: RemoveVideoSegmentArguments
) => {
    let removedFiles = 0;
    if (isVideoSegmentKept === "no") {
        console.log("\nRemoving video segments:");

        videoSegments.forEach((file) => {
            console.log("\t", file);
            fs.unlinkSync(`${baseOutputPath}/${file}`);
            removedFiles++;
        });

        console.log(`\nTotal video segments removed: ${removedFiles}`);

        videoSegments = fs.readdirSync(baseOutputPath);
        if (videoSegments.length > 0) {
            console.log(`\nSome files remain inside the \x1b[95m${nameOnly}\x1b[0m directory. You can manually remove it safely.`);
        } else {
            fs.rmdirSync(nameOnly);
        }
    } else {
        console.log("\nVideo segments will be kept.");
    }
}

export const mergeVideos = (mergeOptions: MergeOptions) => {
    const {
        videoSegments,
        nameOnly,
        baseOutputPath
    } = mergeOptions;

    createSegmentList(videoSegments, baseOutputPath);

    const outputFile = `${nameOnly} (Result).${extensionName}`;

    // Concatenate all the videos listed in the mylist.txt.
    if (fs.readdirSync(".").includes(outputFile)) {
        console.log(`\nThe file [\x1b[94m${outputFile}\x1b[0m] already exists. Removing file before making a new one. . .`);

        fs.unlinkSync(outputFile);
    }

    console.log("\nMerging video segments. . .");

    execSync(`ffmpeg -v warning -f concat -safe 0 -i ${segmentListFilename} -c copy "${outputFile}"`, execSyncOptions);

    console.log(`
\x1b[32m${outputFile}\x1b[0m has been created.
    
Removing ${segmentListFilename}. . .`
    );

    fs.unlinkSync(segmentListFilename);

    const {totalTime, timeDiff, ...rest} = mergeOptions

    removeVideoSegments(rest)
    createTimestampCopy(nameOnly);

    console.log(`\nCreating copy of ${tsInput}. . .`)

    let sexagesimal = sexagesimalFormat(totalTime);

    console.log(`
Video trimmer has finished. Video output should be about ${sexagesimal} long. 
Total processing time: ${sexagesimalFormat(timeDiff / 1000)}`
    );

};