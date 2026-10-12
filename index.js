// src/config.ts
var FFMPEG_OPTIONS = {
  OFFSET: 0,
  // offset in seconds.
  FPS: 0,
  // override in case of low fps from VFR inputs.
  HEVC: false,
  // encoding defaults to h264.
  EXEC_SYNC_OPTIONS: { stdio: "inherit" }
};
var FILENAME_OPTIONS = {
  EXTENSION_NAME: "mp4",
  TIMESTAMPS_FILENAME: "timestamps.txt",
  SEGMENT_LIST_FILENAME: "mylist.txt",
  SUPPORTED_EXTENSIONS: ["webm", "mkv", "flv", "avi", "ts", "mov", "mp4"]
};
var APP_OPTIONS = {
  IGNORE_ERRORS: true,
  KEEP_VIDEO_SEGMENTS: true,
  KEEP_TIMESTAMP_COPY: true,
  AUTO_RENAME: false,
  AUTO_SUSPEND: false
};

// src/init/main.ts
import fs2 from "node:fs";
import path5 from "node:path";

// src/system/childProcess.ts
import path from "node:path";
import { spawnSync } from "node:child_process";
function createVideoSegment(args, execSyncOptions) {
  return spawnSync("ffmpeg", args, execSyncOptions);
}
function mergeVideoSegments(segmentListFilename, outputFilename, execSyncOptions) {
  const args = [
    "-v",
    "warning",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    segmentListFilename,
    "-c",
    "copy",
    outputFilename
  ];
  spawnSync(`ffmpeg`, args, execSyncOptions);
}
function getVideoDuration(baseOutputPath, file) {
  const fullPath = path.join(baseOutputPath, file);
  const args = [
    "-v",
    "warning",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    fullPath
  ];
  const res = spawnSync("ffprobe", args, { encoding: "utf8" });
  return Number(res.stdout);
}
function suspendSystem() {
  switch (process.platform) {
    case "linux":
      spawnSync("systemctl", ["suspend"]);
      break;
    default:
      break;
  }
}

// src/system/filesystem.ts
import fs from "node:fs";
import path3 from "node:path";

// src/utils/formatter.ts
import path2 from "node:path";

// src/utils/errors/unexpectedError.ts
var UnexpectedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UnexpectedError";
  }
};

// src/utils/formatter.ts
function coloredText(colorCode, message) {
  return `\x1B[${colorCode}${message}\x1B[0m`;
}
function redText(text) {
  return coloredText("31m", text);
}
function greenText(text) {
  return coloredText("32m", text);
}
function blueText(text) {
  return coloredText("94m", text);
}
function purpleText(text) {
  return coloredText("35m", text);
}
function videoCounter(counter) {
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
function createFfmpegArgs({ input, timestampPairs, videoSegments }, { FPS, HEVC }) {
  const basename = path2.parse(input).name;
  const encoder = HEVC ? [
    "-x265-params",
    "log-level=error",
    "-crf",
    "23",
    "-c:v",
    "hevc",
    "-tag:v",
    "hvc1"
  ] : ["-crf", "18", "-c:v", "h264"];
  const fps = FPS === 0 ? [] : ["-r", FPS.toString()];
  return timestampPairs.reduce((acc, ts, idx) => {
    const counter = idx + 1;
    const number = videoCounter(counter);
    const outputFilename = `${basename}_${number}.${FILENAME_OPTIONS.EXTENSION_NAME}`;
    if (videoSegments.includes(outputFilename)) return acc;
    const ts0 = ts[0];
    const ts1 = ts[1];
    if (ts0 === void 0 || ts1 === void 0)
      throw new UnexpectedError(
        removeIndent(`
          One of the timestamps is undefined:
            1st: ${ts0 ?? "undefined"}
            2nd: ${ts1 ?? "undefined"}`)
      );
    let cmd = [
      "-v",
      "warning",
      "-nostats",
      "-ss",
      ts0,
      "-to",
      ts1,
      "-i",
      input
    ];
    cmd = cmd.concat(encoder);
    cmd = cmd.concat(fps);
    cmd = cmd.concat([path2.join(basename, outputFilename)]);
    return [...acc, cmd];
  }, []);
}
function getVideoSegmentRegExp(nameOnly, extensionName) {
  const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
  return new RegExp(pattern);
}
function outputFilenameFormatter(basename) {
  return `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;
}
function errorMsgFormatter(message) {
  return `
${message}
`;
}
function removeIndent(message) {
  const match = /\n([ \t]+)/.exec(message);
  let formatted = message;
  if (match) {
    const indent = match[1];
    if (indent === void 0)
      throw new Error(
        errorMsgFormatter("Unexpected error: matching pattern is undefined.")
      );
    formatted = message.replace(new RegExp(`^${indent}`, "gm"), "");
  }
  return formatted;
}

// src/system/filesystem.ts
function readTimestamps() {
  return fs.createReadStream(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
}
function checkVideoFile(videoFile, lineNumber) {
  if (!fs.readdirSync(".").includes(videoFile)) {
    throw new Error(
      errorMsgFormatter(
        `[${redText(videoFile)}] was not found. Make sure to put the correct video filename at line ${lineNumber.toString()} of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`
      )
    );
  }
}
function createSegmentList(videoSegments, basename) {
  let myList = "";
  videoSegments.forEach(
    (file, index) => myList += `${index !== 0 ? "\n" : ""}file '${path3.join(basename, file)}'`
  );
  fs.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, myList);
}
function removeSegmentList() {
  fs.rmSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME);
}
function removeOutputIfExists(outputFile) {
  if (fs.readdirSync(".").includes(outputFile)) {
    console.log(
      `
The file [${blueText(outputFile)}] already exists. Removing file before making a new one. . .`
    );
    fs.rmSync(outputFile);
  }
}
function removeVideoSegments(baseName) {
  fs.rmSync(baseName, { recursive: true, force: true });
}
function createTimestampCopy(outputFilename, content) {
  fs.writeFileSync(`${outputFilename}.txt`, content, { encoding: "utf-8" });
}
function renameFile(oldFilename, newFilename) {
  fs.renameSync(oldFilename, newFilename);
}
function getFileSize(filename) {
  return fs.statSync(filename).size;
}

// src/utils/validator.ts
function checkVideoDurationErrors(videoSegments, videoSegmentDurations, baseName, addError) {
  return videoSegments.reduce((acc, file, index) => {
    const durationInSeconds = getVideoDuration(baseName, file);
    if (videoSegmentDurations[index] === void 0) {
      throw new Error(
        errorMsgFormatter(
          `Duration of video segment for index ${index.toString()} might be undefined.`
        )
      );
    }
    const difference = Math.abs(
      videoSegmentDurations[index] - durationInSeconds
    );
    const isGreaterThanOne = difference > 1;
    const message = removeIndent(`
        [${blueText(file)}] Duration: 
            - Computed: ${videoSegmentDurations[index].toFixed(3)} seconds
            - Actual: ${durationInSeconds.toFixed(3)} seconds
            - Difference: ${difference.toFixed(3)} seconds.${isGreaterThanOne ? redText(" Possible Error!") : greenText(" Result Okay!")}`);
    console.log(message);
    if (isGreaterThanOne) {
      addError(message);
      return [...acc, file];
    }
    return acc;
  }, []);
}
function checkFileSizeDiff(oldFile, newFile, addError) {
  const oldSize = getFileSize(oldFile);
  const newSize = getFileSize(newFile);
  const diffInMB = (oldSize - newSize) / (1024 * 1024);
  if (diffInMB >= 0) {
    return `Saved ${greenText(diffInMB.toFixed(3))} MB`;
  } else {
    const message = removeIndent(`
        File [${blueText(newFile)}]:
            New file size is bigger than the original file by ${redText(Math.abs(diffInMB).toFixed(3))} MB.`);
    addError(message);
    return message;
  }
}

// src/utils/timestamp.ts
import path4 from "node:path";
import readline from "node:readline";
var timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}";
var timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);
var specialCharsRegex = /[`~!@#$%^&*()=[\]{}\\|;:'",<>?]/g;
function hmsToSeconds(sexagesimal) {
  const timeArr = sexagesimal.split(":");
  return timeArr.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
}
function secondsToHms(durationInSeconds) {
  const hour = Math.floor(durationInSeconds / 3600);
  const minute = Math.floor(durationInSeconds % 3600 / 60);
  const seconds = durationInSeconds % 3600 % 60;
  const hourFormat = hour < 10 ? "0" + hour.toString() : hour.toString();
  const minuteFormat = minute < 10 ? "0" + minute.toString() : minute.toString();
  const secondsFormat = seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);
  return `${hourFormat}:${minuteFormat}:${secondsFormat}`;
}
function getTimestampPair(timestamp, offset) {
  let timestampPair = timestamp.split(/\s/);
  if (offset !== 0) {
    timestampPair = timestampPair.map((singleTs) => {
      const tsInSeconds = hmsToSeconds(singleTs);
      return secondsToHms(tsInSeconds + offset);
    });
  }
  return timestampPair;
}
function logAndThrowErrors(tsError) {
  if (tsError.length > 0) {
    tsError.forEach((err) => {
      console.error(err);
    });
    throw new Error(errorMsgFormatter("Timestamp errors were found."));
  }
}
function wrongOrderFilter(...[{ hms1, hms2, seconds1, seconds2 }, idx]) {
  if (seconds2 <= seconds1) {
    return removeIndent(`
      Timestamp duration error at line ${idx.toString()}:
          --- Timestamp [${hms2}] should be greater than [${hms1}].`);
  }
}
function duplicateTimestampFilter(...[{ hms1 }, idx, prevHms]) {
  const prevHms2 = prevHms.split(/\s/)[1];
  if (prevHms2 === void 0 && idx > 2)
    throw new UnexpectedError(
      `
The 2nd timestamp from line ${idx.toString()} might be undefined.`
    );
  if (hms1 === prevHms2) {
    return removeIndent(`
      Duplicate timestamp found at line ${(idx - 1).toString()} and line ${idx.toString()}:
          --- Two instances of timestamp [${hms1}] were found.`);
  }
}
var filters = [wrongOrderFilter, duplicateTimestampFilter];
function processTimestamps(line, lineNumber, prevHms) {
  const timestampErrors = [];
  const [hms1, hms2] = line.split(/\s/g);
  const seconds1 = hmsToSeconds(hms1);
  const seconds2 = hmsToSeconds(hms2);
  const timestampFormats = { hms1, hms2, seconds1, seconds2 };
  const hasError = filters.some((filter) => {
    const errorMessage = filter(timestampFormats, lineNumber, prevHms);
    if (errorMessage !== void 0) {
      timestampErrors.push(errorMessage);
      return true;
    }
  });
  if (hasError) return { type: "error", errors: timestampErrors };
  return {
    type: "success",
    timestampPairs: getTimestampPair(line, FFMPEG_OPTIONS.OFFSET),
    videoSegmentDuration: seconds2 - seconds1
  };
}
function checkFileExtension(videoFilename, lineNumber) {
  const extensionName = path4.extname(videoFilename).toLowerCase().slice(1);
  const extensionError = FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);
  if (extensionError === -1) {
    const formatter = new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction"
    });
    const extensionList = formatter.format(
      FILENAME_OPTIONS.SUPPORTED_EXTENSIONS
    );
    const unindent = removeIndent(`Invalid timestamp or video format [${redText(videoFilename)}] at line ${lineNumber.toString()}.
        If this was meant to be a filename, only the following extensions are valid:
            ${extensionList}`);
    throw new Error(errorMsgFormatter(unindent));
  }
}
function checkVideoFilename(videoFilename, lineNumber) {
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
function createDefaultMainArg() {
  return {
    timestampPairs: [],
    videoSegmentDurations: [],
    videoFilename: "",
    oldFilename: ""
  };
}
function processVideoInput(line, lineNumber) {
  checkFileExtension(line, lineNumber);
  checkVideoFile(line, lineNumber);
  const newFilename = checkVideoFilename(line, lineNumber);
  const mainArg = createDefaultMainArg();
  if (newFilename !== void 0) {
    mainArg.oldFilename = line;
    mainArg.videoFilename = newFilename;
  } else {
    mainArg.oldFilename = line;
    mainArg.videoFilename = line;
  }
  return mainArg;
}
async function getMainArgs(readStream) {
  const mainArgs = [];
  let timestampErrors = [];
  let mainArg = createDefaultMainArg();
  let lineNumber = 0;
  let previousTimestamp = "";
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity
    // Recognizes all CR LF variants
  });
  try {
    for await (let line of rl) {
      lineNumber += 1;
      line = line.trim();
      if (line === "" && lineNumber === 1)
        throw new Error(errorMsgFormatter("First line cannot be empty."));
      if (line === "") continue;
      if (mainArg.videoFilename === "") {
        const res2 = processVideoInput(line, lineNumber);
        mainArg.oldFilename = res2.oldFilename;
        mainArg.videoFilename = res2.videoFilename;
        continue;
      }
      if (timestampRegex.test(line)) {
        const res2 = processTimestamps(line, lineNumber, previousTimestamp);
        if (res2.type === "error") {
          timestampErrors = timestampErrors.concat(res2.errors);
          continue;
        }
        mainArg.timestampPairs.push(res2.timestampPairs);
        mainArg.videoSegmentDurations.push(res2.videoSegmentDuration);
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

// src/init/main.ts
function getTimestamp(mainArg) {
  const timestamp = mainArg.timestampPairs.reduce((acc, cur) => {
    const tsLine = "\n" + cur.join(" ");
    return acc + tsLine;
  }, "");
  return mainArg.videoFilename + timestamp;
}
function getTotalTime(mainArg) {
  return mainArg.videoSegmentDurations.reduce((acc, cur) => acc + cur, 0);
}
function main(args, addError) {
  const { timestampPairs, videoSegmentDurations, videoFilename } = args;
  const baseName = path5.parse(videoFilename).name;
  fs2.mkdirSync(baseName, { recursive: true });
  let videoSegments = fs2.readdirSync(baseName);
  const ffmpegArgs = {
    input: videoFilename,
    timestampPairs,
    videoSegments
  };
  const ffmpegScripts = createFfmpegArgs(ffmpegArgs, FFMPEG_OPTIONS);
  console.log("\nExecuting FFmpeg. This may take a while. . .");
  const time1 = Date.now();
  ffmpegScripts.forEach((script) => {
    console.log(["\nffmpeg", ...script].join(" "));
    createVideoSegment(script, FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS);
  });
  const elapsedTime = (Date.now() - time1) / 1e3;
  const videoSegmentRegExp = getVideoSegmentRegExp(
    baseName,
    FILENAME_OPTIONS.EXTENSION_NAME
  );
  videoSegments = fs2.readdirSync(baseName).filter((file) => videoSegmentRegExp.test(file));
  const possibleErrors = checkVideoDurationErrors(
    videoSegments,
    videoSegmentDurations,
    baseName,
    addError
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
    FFMPEG_OPTIONS.EXEC_SYNC_OPTIONS
  );
  console.log(`
${greenText(outputFile)} has been created.`);
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

// src/utils/errors/endErrorLogger.ts
var EndErrorLogger = class extends Error {
  #errors = [];
  constructor() {
    super();
    this.name = this.constructor.name;
    this.#errors = [];
  }
  addError = (error) => {
    this.#errors.push(error);
  };
  logErrors = () => {
    this.#errors.forEach((error) => {
      console.error(error);
    });
  };
};

// src/init/init.ts
async function init(endErrorLogger) {
  const readStream = readTimestamps();
  const mainArgs = await getMainArgs(readStream);
  mainArgs.forEach((mainArg) => {
    if (mainArg.oldFilename !== mainArg.videoFilename) {
      renameFile(mainArg.oldFilename, mainArg.videoFilename);
    }
  });
  mainArgs.forEach((mainArg) => {
    main(mainArg, endErrorLogger.addError);
  });
  endErrorLogger.logErrors();
  if (APP_OPTIONS.AUTO_SUSPEND) suspendSystem();
}

// src/index.ts
if (FFMPEG_OPTIONS.OFFSET !== 0) {
  console.log(
    purpleText(`Offset Value: ${FFMPEG_OPTIONS.OFFSET.toFixed(3)} seconds`)
  );
}
try {
  const endErrorLogger = new EndErrorLogger();
  await init(endErrorLogger);
} catch (e) {
  console.log(`
= = = = = = = = = = H I N T S : = = = = = = = = = =

* Line 1 should be the video filename including its extension. 
    Example: input.mp4.

* Timestamp format for each line (except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space in between.
    Example: 10:00:00.123456789 11:00:00.123456789

* Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. 
    Example: 12:34:56.123456789

* Don't leave any empty lines.
`);
  console.error(e);
}
