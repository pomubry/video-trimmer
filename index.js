"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/init/main.ts
var import_fs = __toESM(require("fs"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// src/system/childProcess.ts
var import_node_path = __toESM(require("node:path"), 1);
var import_node_child_process = require("node:child_process");

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
  BATCH_SEPARATOR: "@batch@",
  KEEP_TIMESTAMP_COPY: true,
  AUTO_RENAME: false,
  AUTO_SUSPEND: false
};

// src/system/childProcess.ts
var createVideoSegment = (args, execSyncOptions) => (0, import_node_child_process.spawnSync)("ffmpeg", args, execSyncOptions);
var mergeVideoSegments = (segmentListFilename, outputFilename, execSyncOptions) => {
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
  (0, import_node_child_process.spawnSync)(`ffmpeg`, args, execSyncOptions);
};
var getVideoDuration = (baseOutputPath, file) => {
  const fullPath = import_node_path.default.join(baseOutputPath, file);
  const args = [
    "-v",
    "warning",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    fullPath
  ];
  const res = (0, import_node_child_process.spawnSync)("ffprobe", args, { encoding: "utf8" });
  return Number(res.stdout);
};
var suspendSystem = () => {
  if (APP_OPTIONS.AUTO_SUSPEND) {
    switch (process.platform) {
      case "linux":
        (0, import_node_child_process.spawnSync)("systemctl", ["suspend"]);
        break;
      default:
        break;
    }
  }
};

// src/system/filesystem.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// src/utils/formatter.ts
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_os = __toESM(require("node:os"), 1);

// src/utils/errors/unexpectedError.ts
var UnexpectedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UnexpectedError";
  }
};

// src/utils/formatter.ts
var coloredText = (colorCode, message) => `\x1B[${colorCode}${message}\x1B[0m`;
var redText = (text) => coloredText("31m", text);
var greenText = (text) => coloredText("32m", text);
var blueText = (text) => coloredText("94m", text);
var purpleText = (text) => coloredText("35m", text);
var videoCounter = (counter) => {
  let number = "";
  if (counter < 10) {
    number = "00" + counter.toString();
  } else if (counter < 100) {
    number = "0" + counter.toString();
  } else {
    number += counter.toString();
  }
  return number;
};
var createFfmpegArgs = ({ input, timestampPairs, videoSegments }, { FPS, HEVC }) => {
  const basename = import_node_path2.default.parse(input).name;
  const hevcEncoder = import_node_os.default.platform() === "darwin" ? "hevc_videotoolbox" : "hevc";
  const encoder = HEVC ? [
    "-x265-params",
    "log-level=error",
    "-crf",
    "23",
    "-c:v",
    hevcEncoder,
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
    cmd = cmd.concat([import_node_path2.default.join(basename, outputFilename)]);
    return [...acc, cmd];
  }, []);
};
var getVideoSegmentRegExp = (nameOnly, extensionName) => {
  const pattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
  return new RegExp(pattern);
};
var outputFilenameFormatter = (basename) => `${basename} (Result).${FILENAME_OPTIONS.EXTENSION_NAME}`;
var errorMsgFormatter = (message) => `
${message}
`;
var removeIndent = (message) => {
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
};

// src/system/filesystem.ts
var readTimestamps = () => {
  try {
    return import_node_fs.default.readFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, "utf-8");
  } catch {
    throw new Error(
      errorMsgFormatter(
        `The file [${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}] was not found!`
      )
    );
  }
};
var checkVideoFile = (videoFile) => {
  if (!import_node_fs.default.readdirSync(".").includes(videoFile)) {
    throw new Error(
      errorMsgFormatter(
        `${videoFile} was not found. Make sure to put the correct video filename at the top (Line 1) of ${FILENAME_OPTIONS.TIMESTAMPS_FILENAME}.`
      )
    );
  }
};
var createSegmentList = (videoSegments, basename) => {
  let myList = "";
  videoSegments.forEach(
    (file, index) => myList += `${index !== 0 ? "\n" : ""}file '${import_node_path3.default.join(basename, file)}'`
  );
  import_node_fs.default.writeFileSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME, myList);
};
var removeSegmentList = () => {
  import_node_fs.default.rmSync(FILENAME_OPTIONS.SEGMENT_LIST_FILENAME);
};
var removeOutputIfExists = (outputFile) => {
  if (import_node_fs.default.readdirSync(".").includes(outputFile)) {
    console.log(
      `
The file [${blueText(outputFile)}] already exists. Removing file before making a new one. . .`
    );
    import_node_fs.default.rmSync(outputFile);
  }
};
var removeVideoSegments = (baseName) => {
  if (!APP_OPTIONS.KEEP_VIDEO_SEGMENTS) {
    import_node_fs.default.rmSync(baseName, { recursive: true, force: true });
  }
};
var createTimestampCopy = (outputFilename, content) => {
  import_node_fs.default.writeFileSync(`${outputFilename}.txt`, content, { encoding: "utf-8" });
};
var renameFile = (timestampArr, newFilename) => {
  if (timestampArr[0] === void 0)
    throw new Error(
      errorMsgFormatter("Renaming file failed because of empty timestamp.")
    );
  if (timestampArr[0] === newFilename) return;
  import_node_fs.default.renameSync(timestampArr[0], newFilename);
};
var getFileSize = (filename) => import_node_fs.default.statSync(filename).size;

// src/utils/validator.ts
var checkVideoDurationErrors = (videoSegments, videoSegmentDurations, baseName, addError) => videoSegments.reduce((acc, file, index) => {
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
var checkFileSizeDiff = (oldFile, newFile, addError) => {
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
};

// src/utils/timestamp.ts
var import_node_path4 = __toESM(require("node:path"), 1);
var timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}";
var timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);
var specialCharsRegex = /[`~!@#$%^&*()=[\]{}\\|;:'",<>?]/g;
var hmsToSeconds = (sexagesimal) => {
  const timeArr = sexagesimal.split(":");
  return timeArr.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
};
var getTimestampPair = (timestamp, offset) => {
  let timestampPair = timestamp.split(/\s/);
  if (offset !== 0) {
    timestampPair = timestampPair.map((singleTs) => {
      const tsInSeconds = hmsToSeconds(singleTs);
      return secondsToHms(tsInSeconds + offset);
    });
  }
  return timestampPair;
};
var logAndThrowErrors = (tsError) => {
  if (tsError.length > 0) {
    tsError.forEach((err) => {
      console.error(err);
    });
    throw new Error(errorMsgFormatter("Timestamp errors were found."));
  }
};
var wrongOrderFilter = ({ hms1, hms2, seconds1, seconds2 }, idx) => {
  if (seconds2 <= seconds1) {
    const unindent = removeIndent(`
      Timestamp duration error at line ${(idx + 1).toString()}:
          --- Timestamp [${hms2}] should be greater than [${hms1}].`);
    return unindent;
  }
};
var duplicateTimestampFilter = ({ hms1 }, idx, timestampArr) => {
  const prevHms = timestampArr[idx - 1];
  if (prevHms === void 0)
    throw new UnexpectedError("Previous timestamp is undefined.");
  const prevHms2 = prevHms.split(/\s/)[1];
  if (prevHms2 === void 0 && idx > 1)
    throw new UnexpectedError(
      `
The 2nd timestamp from line ${idx.toString()} might be undefined.`
    );
  if (hms1 === prevHms2) {
    return removeIndent(`
      Duplicate timestamp found at line ${idx.toString()} and line ${(idx + 1).toString()}:
          --- Two instances of timestamp [${hms1}] were found.`);
  }
};
var filters = [wrongOrderFilter, duplicateTimestampFilter];
var processTimestamps = (timestampArr) => {
  const timestampErrors = [];
  const videoSegmentDurations = [];
  const timestampPairs = [];
  const videoFilename = timestampArr[0];
  if (videoFilename === void 0)
    throw new UnexpectedError("Video filename is undefined.");
  for (const [idx, timestamp] of timestampArr.entries()) {
    if (idx === 0) continue;
    if (timestamp === "" && idx === timestampArr.length - 1) continue;
    if (!timestampRegex.test(timestamp)) {
      timestampErrors.push(
        `
Invalid timestamp format at line ${(idx + 1).toString()}: [${timestamp}].`
      );
      continue;
    }
    const [hms1, hms2] = timestamp.split(/\s/g);
    const seconds1 = hmsToSeconds(hms1);
    const seconds2 = hmsToSeconds(hms2);
    const timestampFormats = { hms1, hms2, seconds1, seconds2 };
    const hasError = filters.some((filter) => {
      const errorMessage = filter(timestampFormats, idx, timestampArr);
      if (errorMessage !== void 0) {
        timestampErrors.push(errorMessage);
        return true;
      }
    });
    if (hasError) continue;
    videoSegmentDurations.push(seconds2 - seconds1);
    timestampPairs.push(getTimestampPair(timestamp, FFMPEG_OPTIONS.OFFSET));
  }
  logAndThrowErrors(timestampErrors);
  const totalTime = videoSegmentDurations.reduce((acc, cur) => acc + cur, 0);
  return { timestampPairs, totalTime, videoSegmentDurations, videoFilename };
};
var checkFileExtension = (videoFilename) => {
  const extensionName = import_node_path4.default.extname(videoFilename).toLowerCase().slice(1);
  const extensionError = FILENAME_OPTIONS.SUPPORTED_EXTENSIONS.indexOf(extensionName);
  if (extensionError === -1) {
    const formatter = new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction"
    });
    const extensionList = formatter.format(
      FILENAME_OPTIONS.SUPPORTED_EXTENSIONS
    );
    const unindent = removeIndent(`The video format ${extensionName} is not supported.
        Only the following extensions are valid:
            ${extensionList}`);
    throw new Error(errorMsgFormatter(unindent));
  }
};
var getSuggestedFilename = (videoFilename) => `Try renaming your filename to [${greenText(videoFilename)}] instead.`;
var checkVideoFilename = (videoFilename) => {
  const isInvalidFilename = specialCharsRegex.test(videoFilename);
  if (isInvalidFilename) {
    const newFilename = videoFilename.replace(specialCharsRegex, "");
    if (APP_OPTIONS.AUTO_RENAME) return newFilename;
    const unindent = removeIndent(`The video filename should not contain any special characters.
        ${getSuggestedFilename(newFilename)}`);
    throw new Error(errorMsgFormatter(unindent));
  }
};
var getMainArgs = (timestampArr) => {
  const res = {
    timestamp: "",
    ...processTimestamps(timestampArr)
  };
  checkFileExtension(res.videoFilename);
  checkVideoFile(res.videoFilename);
  const newFilename = checkVideoFilename(res.videoFilename);
  if (newFilename !== void 0) res.videoFilename = newFilename;
  const timestampPairs = res.timestampPairs.map((pair) => pair.join(" "));
  res.timestamp = [newFilename ?? res.videoFilename, ...timestampPairs].join(
    "\n"
  );
  return res;
};
var secondsToHms = (durationInSeconds) => {
  const hour = Math.floor(durationInSeconds / 3600);
  const minute = Math.floor(durationInSeconds % 3600 / 60);
  const seconds = durationInSeconds % 3600 % 60;
  const hourFormat = hour < 10 ? "0" + hour.toString() : hour.toString();
  const minuteFormat = minute < 10 ? "0" + minute.toString() : minute.toString();
  const secondsFormat = seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);
  return `${hourFormat}:${minuteFormat}:${secondsFormat}`;
};
var getTimestampArray = (timestamp, separator) => timestamp.split(separator).map((ts) => ts.trim()).filter(Boolean);

// src/init/main.ts
var main = (args, addError) => {
  const { timestampPairs, totalTime, videoSegmentDurations, videoFilename } = args;
  const baseName = import_node_path5.default.parse(videoFilename).name;
  import_fs.default.mkdirSync(baseName, { recursive: true });
  let videoSegments = import_fs.default.readdirSync(baseName);
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
  videoSegments = import_fs.default.readdirSync(baseName).filter((file) => videoSegmentRegExp.test(file));
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
  removeVideoSegments(baseName);
  if (APP_OPTIONS.KEEP_TIMESTAMP_COPY) {
    createTimestampCopy(baseName, args.timestamp);
  }
  const hms = secondsToHms(totalTime);
  const fileSizeDiff = checkFileSizeDiff(videoFilename, outputFile, addError);
  console.log(`
DONE! Video output should be about ${hms} long. 
Total processing time: ${secondsToHms(elapsedTime)}
${fileSizeDiff}
`);
  console.log("=".repeat(process.stdout.columns));
};

// src/utils/endErrorLogger.ts
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
var endErrorLogger = new EndErrorLogger();

// src/init/init.ts
var init = (endErrorLogger2) => {
  const ts = readTimestamps();
  if (ts.includes(APP_OPTIONS.BATCH_SEPARATOR)) {
    const timestampBatch = getTimestampArray(ts, APP_OPTIONS.BATCH_SEPARATOR);
    const mainArgs = timestampBatch.map((ts2) => getTimestampArray(ts2, "\n")).map((timestampArr) => {
      const args = getMainArgs(timestampArr);
      renameFile(timestampArr, args.videoFilename);
      return args;
    });
    mainArgs.forEach((arg, i) => {
      if (timestampBatch[i] === void 0)
        throw new Error(
          errorMsgFormatter(
            `Index ${i.toString()} of the timestamp batch is undefined.
                        ${timestampBatch}`
            // eslint-disable-line @typescript-eslint/restrict-template-expressions
          )
        );
      main(arg, endErrorLogger2.addError);
    });
  } else {
    const timestampArr = getTimestampArray(ts, "\n");
    const args = getMainArgs(timestampArr);
    renameFile(timestampArr, args.videoFilename);
    main(args, endErrorLogger2.addError);
  }
  endErrorLogger2.logErrors();
  suspendSystem();
};

// src/index.ts
if (FFMPEG_OPTIONS.OFFSET !== 0) {
  console.log(
    purpleText(`Offset Value: ${FFMPEG_OPTIONS.OFFSET.toFixed(3)} seconds`)
  );
}
try {
  init(endErrorLogger);
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
