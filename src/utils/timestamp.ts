import path from "node:path";
import readline from "node:readline";

import { checkVideoFile } from "../system/filesystem.js";
import {
  errorMsgFormatter,
  greenText,
  redText,
  removeIndent,
} from "./formatter.js";
import { UnexpectedError } from "./errors/unexpectedError.js";
import { APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS } from "../config.js";

import type { MainArg } from "../types/index.js";
import type { Readable } from "node:stream";

interface TimestampFormats {
  hms1: string;
  hms2: string;
  seconds1: number;
  seconds2: number;
}

type FilterParams = [
  timestampFormats: TimestampFormats,
  idx: number,
  prevHms: string,
];

type FilterReturn = string | undefined;
type FilterFunc = (...[arg1, arg2, arg3]: FilterParams) => FilterReturn;

interface SuccessTimestamp {
  type: "success";
  timestampPairs: string[];
  videoSegmentDuration: number;
}

interface ErrorTimestamp {
  type: "error";
  errors: string[];
}

// Timestamp in HMS format: '12:34:56.123456789 12:34:56.123456789. Note the double backslash'
const timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}";
const timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);
const specialCharsRegex = /[`~!@#$%^&*()=[\]{}\\|;:'",<>?]/g;

function hmsToSeconds(sexagesimal: string) {
  const timeArr = sexagesimal.split(":");
  return timeArr.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0,
  );
}

/**
 Convert seconds to hour:minute:seconds format
 Example: 60 --> 00:01:0.000
 **/
export function secondsToHms(durationInSeconds: number) {
  const hour = Math.floor(durationInSeconds / 3600);
  const minute = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = (durationInSeconds % 3600) % 60;

  const hourFormat = hour < 10 ? "0" + hour.toString() : hour.toString();
  const minuteFormat =
    minute < 10 ? "0" + minute.toString() : minute.toString();
  const secondsFormat =
    seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);

  return `${hourFormat}:${minuteFormat}:${secondsFormat}`;
}

/*
Split the strings inside the array by whitespaces and add offset.
The result would be in the form: [timestamp1,timestamp2]
*/
function getTimestampPair(timestamp: string, offset: number) {
  let timestampPair = timestamp.split(/\s/);

  if (offset !== 0) {
    timestampPair = timestampPair.map((singleTs) => {
      const tsInSeconds = hmsToSeconds(singleTs);
      return secondsToHms(tsInSeconds + offset);
    });
  }

  return timestampPair;
}

function logAndThrowErrors(tsError: string[]) {
  if (tsError.length > 0) {
    tsError.forEach((err) => {
      console.error(err);
    });
    throw new Error(errorMsgFormatter("Timestamp errors were found."));
  }
}

// Check if the timestamps are in the right order
function wrongOrderFilter(
  ...[{ hms1, hms2, seconds1, seconds2 }, idx]: FilterParams
): FilterReturn {
  if (seconds2 <= seconds1) {
    return removeIndent(`
      Timestamp duration error at line ${idx.toString()}:
          --- Timestamp [${hms2}] should be greater than [${hms1}].`);
  }
}

/*
Check if the 1st timestamp of the current iteration is equal to the 2nd timestamp of the previous iteration.
i.e.,
"00:01:00.000 00:05:00.000"
"00:05:00.000 00:10:00.000"
will give an error.
*/
function duplicateTimestampFilter(
  ...[{ hms1 }, idx, prevHms]: FilterParams
): FilterReturn {
  const prevHms2 = prevHms.split(/\s/)[1];
  if (prevHms2 === undefined && idx > 2)
    throw new UnexpectedError(
      `\nThe 2nd timestamp from line ${idx.toString()} might be undefined.`,
    );

  if (hms1 === prevHms2) {
    return removeIndent(`
      Duplicate timestamp found at line ${(idx - 1).toString()} and line ${idx.toString()}:
          --- Two instances of timestamp [${hms1}] were found.`);
  }
}

const filters: FilterFunc[] = [wrongOrderFilter, duplicateTimestampFilter];

function processTimestamps(
  line: string,
  lineNumber: number,
  prevHms: string,
): SuccessTimestamp | ErrorTimestamp {
  const timestampErrors: string[] = [];

  const [hms1, hms2] = line.split(/\s/g) as [string, string];
  const seconds1 = hmsToSeconds(hms1);
  const seconds2 = hmsToSeconds(hms2);
  const timestampFormats = { hms1, hms2, seconds1, seconds2 };

  const hasError = filters.some((filter) => {
    const errorMessage = filter(timestampFormats, lineNumber, prevHms);
    if (errorMessage !== undefined) {
      timestampErrors.push(errorMessage);
      return true;
    }
  });

  if (hasError) return { type: "error", errors: timestampErrors };

  return {
    type: "success",
    timestampPairs: getTimestampPair(line, FFMPEG_OPTIONS.OFFSET),
    videoSegmentDuration: seconds2 - seconds1,
  };
}

function checkFileExtension(videoFilename: string, lineNumber: number) {
  const extensionName = path.extname(videoFilename).toLowerCase().slice(1);
  const extensionError =
    FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);

  if (extensionError === -1) {
    const formatter = new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction",
    });
    const extensionList = formatter.format(
      FILENAME_OPTIONS.SUPPORTED_EXTENSIONS,
    );

    const unindent =
      removeIndent(`Invalid timestamp or video format [${redText(videoFilename)}] at line ${lineNumber.toString()}.
        If this was meant to be a filename, only the following extensions are valid:
            ${extensionList}`);

    throw new Error(errorMsgFormatter(unindent));
  }
}

function checkVideoFilename(videoFilename: string, lineNumber: number) {
  const isInvalidFilename = specialCharsRegex.test(videoFilename);

  if (isInvalidFilename) {
    const newFilename = videoFilename.replace(specialCharsRegex, "");
    const message = `The video filename should not contain any special characters.
        Try renaming your filename at line ${lineNumber.toString()} to [${greenText(newFilename)}] instead.`;

    if (APP_OPTIONS.AUTO_RENAME) return newFilename;

    const unindent = removeIndent(message);
    throw new Error(errorMsgFormatter(unindent));
  }
}

function createDefaultMainArg(): MainArg {
  return {
    timestampPairs: [],
    videoSegmentDurations: [],
    videoFilename: "",
    oldFilename: "",
  };
}

function processVideoInput(line: string, lineNumber: number): MainArg {
  checkFileExtension(line, lineNumber);
  checkVideoFile(line, lineNumber);

  const newFilename = checkVideoFilename(line, lineNumber);
  const mainArg = createDefaultMainArg();

  if (newFilename !== undefined) {
    mainArg.oldFilename = line;
    mainArg.videoFilename = newFilename;
  } else {
    mainArg.oldFilename = line;
    mainArg.videoFilename = line;
  }

  return mainArg;
}

export async function getMainArgs(readStream: Readable) {
  const mainArgs: MainArg[] = [];

  let timestampErrors: string[] = [];
  let mainArg: MainArg = createDefaultMainArg();
  let lineNumber = 0;
  let previousTimestamp = "";

  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity, // Recognizes all CR LF variants
  });

  try {
    for await (let line of rl) {
      lineNumber += 1;
      line = line.trim();

      if (line === "" && lineNumber === 1)
        throw new Error(errorMsgFormatter("First line cannot be empty."));

      if (line === "") continue;

      if (mainArg.videoFilename === "") {
        const res = processVideoInput(line, lineNumber);
        mainArg.oldFilename = res.oldFilename;
        mainArg.videoFilename = res.videoFilename;
        continue;
      }

      if (timestampRegex.test(line)) {
        const res = processTimestamps(line, lineNumber, previousTimestamp);
        if (res.type === "error") {
          timestampErrors = timestampErrors.concat(res.errors);
          continue;
        }

        mainArg.timestampPairs.push(res.timestampPairs);
        mainArg.videoSegmentDurations.push(res.videoSegmentDuration);
        previousTimestamp = line;
        continue;
      }

      const res = processVideoInput(line, lineNumber);
      mainArgs.push(mainArg);
      mainArg = createDefaultMainArg();
      mainArg.oldFilename = res.oldFilename;
      mainArg.videoFilename = res.videoFilename;
    }
  } finally {
    readStream.destroy();
  }

  logAndThrowErrors(timestampErrors);
  mainArgs.push(mainArg);

  return mainArgs;
}
