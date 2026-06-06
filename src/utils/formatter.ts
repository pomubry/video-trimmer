import path from "node:path";
import os from "node:os";

import { UnexpectedError } from "./errors/unexpectedError.js";
import { FILENAME_OPTIONS } from "../config.js";

import type { FFmpegArguments, FFmpegConfig } from "../types/index.js";

function coloredText(colorCode: string, message: string) {
  return `\x1b[${colorCode}${message}\x1b[0m`;
}
export function redText(text: string) {
  return coloredText("31m", text);
}
export function greenText(text: string) {
  return coloredText("32m", text);
}
export function blueText(text: string) {
  return coloredText("94m", text);
}
export function purpleText(text: string) {
  return coloredText("35m", text);
}

export function videoCounter(counter: number) {
  let number = "";

  if (counter < 10) {
    number = "00" + counter.toString();
  } else if (counter < 100) {
    number = "0" + counter.toString();
  } else {
    number += counter.toString();
  }

  return number;
}

export function createFfmpegArgs(
  { input, timestampPairs, videoSegments }: FFmpegArguments,
  { FPS, HEVC }: FFmpegConfig,
) {
  const basename = path.parse(input).name;

  const hevcEncoder = os.platform() === "darwin" ? "hevc_videotoolbox" : "hevc";
  const encoder = HEVC
    ? [
        "-x265-params",
        "log-level=error",
        "-crf",
        "23",
        "-c:v",
        hevcEncoder,
        "-tag:v",
        "hvc1",
      ]
    : ["-crf", "18", "-c:v", "h264"];

  const fps = FPS === 0 ? [] : ["-r", FPS.toString()];

  return timestampPairs.reduce<string[][]>((acc, ts, idx) => {
    const counter = idx + 1;
    const number = videoCounter(counter);

    // Check first if the fileName already exists. If it does, skip.
    const outputFilename = `${basename}_${number}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
    if (videoSegments.includes(outputFilename)) return acc;

    const ts0 = ts[0];
    const ts1 = ts[1];
    if (ts0 === undefined || ts1 === undefined)
      throw new UnexpectedError(
        removeIndent(`
          One of the timestamps is undefined:
            1st: ${ts0 ?? "undefined"}
            2nd: ${ts1 ?? "undefined"}`),
      );

    let cmd: string[] = [
      "-v",
      "warning",
      "-nostats",
      "-ss",
      ts0,
      "-to",
      ts1,
      "-i",
      input,
    ];
    cmd = cmd.concat(encoder);
    cmd = cmd.concat(fps);
    cmd = cmd.concat([path.join(basename, outputFilename)]);

    return [...acc, cmd];
  }, []);
}

export function getVideoSegmentRegExp(nameOnly: string, extensionName: string) {
  const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
  return new RegExp(pattern);
}

export function outputFilenameFormatter(basename: string) {
  return `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;
}

export function errorMsgFormatter(message: string) {
  return `\n${message}\n`;
}

export function removeIndent(message: string) {
  const match = /\n([ \t]+)/.exec(message);
  let formatted = message;

  if (match) {
    const indent = match[1];
    if (indent === undefined)
      throw new Error(
        errorMsgFormatter("Unexpected error: matching pattern is undefined."),
      );

    formatted = message.replace(new RegExp(`^${indent}`, "gm"), "");
  }

  return formatted;
}
