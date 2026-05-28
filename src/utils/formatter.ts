import path from "node:path";
import os from "node:os"

import { FILENAME_OPTIONS } from "../config.js";

import type { FFmpegArguments, FFmpegConfig } from "../types/index.js";

const coloredText = (colorCode: string, message: string) => `\x1b[${colorCode}${message}\x1b[0m`
export const redText = (text: string) => coloredText("31m", text)
export const greenText = (text: string) => coloredText("32m", text)
export const blueText = (text: string) => coloredText("94m", text)
export const purpleText = (text: string) => coloredText("35m", text)

export const sexagesimalFormat = (durationInSeconds: number) => {
    let hour = Math.floor(durationInSeconds / 3600);
    let minute = Math.floor((durationInSeconds % 3600) / 60);
    let seconds = (durationInSeconds % 3600) % 60;
    return `${hour < 10 ? "0" + hour : hour}:${minute < 10 ? "0" + minute : minute
        }:${seconds < 10 ? "0" + seconds.toFixed(4) : seconds.toFixed(3)}`;
};

export const videoCounter = (counter: number) => {
    let number = "";

    if (counter < 10) {
        number = "00" + counter;
    } else if (counter < 100) {
        number = "0" + counter;
    } else {
        number += `${counter}`;
    }

    return number
}

export const createFFmpegScripts = (
    { input, timestampPairs, videoSegments }: FFmpegArguments,
    { FPS, HEVC }: FFmpegConfig
) => {
    const basename = path.parse(input).name

    return timestampPairs.reduce((acc, ts, idx) => {
        let counter = idx + 1;
        const number = videoCounter(counter)

        // Check first if the fileName already exists. If it does, skip.
        const outputFilename = `${basename}_${number}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
        if (videoSegments.includes(outputFilename)) return acc;

        const encoder = os.platform() === "darwin" ? "hevc_videotoolbox" : "hevc"

        let cmd: string[] = ["-v", "warning", "-nostats", "-ss", ts[0]!, "-to", ts[1]!, "-i", input];

        cmd = cmd.concat(
            HEVC
                ? ["-x265-params", "log-level=error", "-crf", "23", "-c:v", encoder, "-tag:v", "hvc1"]
                : ["-crf", "18", "-c:v", "h264"]
        )

        cmd = cmd.concat(
            FPS === 0
                ? []
                : ["-r", `${FPS}`]
        )

        cmd = cmd.concat([path.join(basename, outputFilename)])

        return [...acc, cmd]
    }, [] as string[][])
}

export const getVideoSegmentRegExp = (nameOnly: string, extensionName: string) => {
    const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
    return new RegExp(pattern);
}

export const outputFilenameFormatter = (basename: string) => `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;

export const errorMsgFormatter = (message: string) => `\n${message}\n`

export const removeIndent = (message: string) => {
    const match = message.match(/\n([ \t]+)/);
    let formatted = message;

    if (match) {
        const indent = match[1];
        formatted = message.replace(new RegExp(`^${indent}`, 'gm'), '');
    }

    return formatted;
}