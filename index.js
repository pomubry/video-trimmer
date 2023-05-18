const fs = require("fs");
const { execSync } = require("child_process");
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const offset = 0; // offset in seconds
if (offset !== 0) {
  console.log("\x1b[35m%s\x1b[0m", `Offset Value: ${offset} seconds`);
}

const sexagesimalFormat = (durationInSeconds) => {
  let hour = Math.floor(durationInSeconds / 3600);
  let minute = Math.floor((durationInSeconds % 3600) / 60);
  let seconds = (durationInSeconds % 3600) % 60;
  let sexagesimal = `${hour < 10 ? "0" + hour : hour}:${
    minute < 10 ? "0" + minute : minute
  }:${seconds < 10 ? "0" + seconds.toFixed(4) : seconds.toFixed(3)}`;
  return sexagesimal;
};

const sexagesimalToSeconds = (sexagesimal) => {
  let timeArr = sexagesimal.split(":");
  let timeInSeconds = timeArr.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
  return timeInSeconds;
};

const createTimestampCopy = (filename) => {
  fs.copyFileSync("./timestamps.txt", `./${filename}.txt`);
};

const endTrigger = () => {
  return rl.close();
};

const mergeVideos = (
  videosDir,
  videosDirPath,
  nameOnly,
  options,
  answer,
  totalTime,
  timeDiff
) => {
  // List the relative path of each video files and save it into mylist.txt.
  let myList = "";
  videosDir.forEach(
    (file, index) =>
      (myList += `${index !== 0 ? "\n" : ""}file '${videosDirPath}/${file}'`)
  );
  fs.writeFileSync("mylist.txt", myList);
  console.log("\nmylist.txt has been created temporarily. . .");

  // Concatenate all the videos listed in the mylist.txt.
  const outputFile = `${nameOnly} (Result).mp4`;

  if (fs.readdirSync(".").includes(outputFile)) {
    // Check first if the output filename already exists. Delete if it does.
    console.log(
      `\nThe file [\x1b[94m${outputFile}\x1b[0m] already exists. Removing file before making a new one. . .`
    );
    fs.unlinkSync(outputFile);
  }
  console.log("\nMerging video segments. . .");
  execSync(
    `ffmpeg -v warning -f concat -safe 0 -i mylist.txt -c copy "${outputFile}"`,
    options
  );
  console.log(`\n\x1b[32m${outputFile}\x1b[0m has been created.`);

  // Remove mylist.txt.
  console.log("\nRemoving mylist.txt. . .");
  fs.unlinkSync("mylist.txt");

  // Remove the video segments that were created in the process.
  let removedFiles = 0;
  if (answer === "no") {
    console.log("\nRemoving video segments:\n");
    videosDir.forEach((file) => {
      console.log(file);
      fs.unlinkSync(`${videosDirPath}/${file}`);
      removedFiles++;
    });
    console.log(`\nTotal video segments removed: ${removedFiles}`);

    videosDir = fs.readdirSync(videosDirPath);
    if (videosDir.length > 0) {
      console.log(
        `\nSome files remain inside the \x1b[95m${nameOnly}\x1b[0m directory. You could manually remove it safely.`
      );
    } else {
      fs.rmdirSync(nameOnly);
    }
  } else {
    console.log("\nVideo segments will be kept.");
  }

  let sexagesimal = sexagesimalFormat(totalTime);

  console.log(
    `\nVideo trimmer has finished. Merged output video should be about ${sexagesimal} long.`
  );

  console.log("\nTotal processing time:", sexagesimalFormat(timeDiff / 1000));

  console.log("\nCreating copy of timestamps.txt");
  createTimestampCopy(nameOnly);
  return endTrigger();
};

const trimFunction = (answer) => {
  let ts = "";

  // Read the contents of the ts.txt file. Return an error if its empty.
  ts += fs.readFileSync("timestamps.txt");
  if (ts.length === 0) {
    console.log("\nTimestamps not found");
    return endTrigger();
  }

  // Check for timestamps errors.
  let tsError = false;

  // Remove carrier return \r and split each timestamps by newlines \n. Filter the array with the correct timestamp format.
  // Timestamp in sexagesimal format: '12:34:56.123456789 12:34:56.123456789'
  let tsRegex = /^\d{2}:\d{2}:\d{2}\.\d{3,9}\s\d{2}:\d{2}:\d{2}\.\d{3,9}$/;
  let totalTime = 0;
  let timeArr = [];
  const timestampArr = ts.split("\n").map((ts) => ts.trim());

  let arr = timestampArr.filter((timestamp, idx) => {
    if (idx === 0) return true;
    if (timestamp === "" && idx === timestampArr.length - 1) return false;

    // Check if the 2nd timestamp in each index is lower than the 1st timestamp. Each index will be split first by whitespace to make it into a subarray.
    // i.e., [[00:06:00.000000000,00:05:00.000000000]] will give an error
    // because 00:05:00.000000000 is lesser/earlier than 00:06:00.000000000. Time format will be converted to seconds for evaluation.
    // If the format is valid, add each videos' duration to the variable 'totalTime' for the output's expected total duration.

    if (tsRegex.test(timestamp)) {
      let timeStamps = timestamp.split(/\s/g);

      // Convert the time string format into seconds.
      let timeStamp1 = sexagesimalToSeconds(timeStamps[0]);
      let timeStamp2 = sexagesimalToSeconds(timeStamps[1]);

      if (timeStamp2 <= timeStamp1) {
        tsError = true;
        console.log(`\nTimestamp duration error at line ${idx + 1}. 
          --- Timestamp [${timeStamps[1]}] should be greater than [${
          timeStamps[0]
        }].`);
      } else {
        totalTime += timeStamp2 - timeStamp1;
        timeArr.push(timeStamp2 - timeStamp1);
        return true;
      }
    } else {
      tsError = true;
      console.log(
        `\nInvalid timestamp format at line ${idx + 1}: [${timestamp}].`
      );
    }
  });

  if (tsError) {
    console.log("\n= = = = = = = = = = H I N T S : = = = = = = = = = =");
    console.log(
      "\n* Line 1 should be the video filename including its extension. \n  Example: input.mp4."
    );
    console.log(
      "\n* Timestamp format for each line(except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space inbetween."
    );
    console.log("  Example: 10:00:00.123456789 11:00:00.123456789");
    console.log(
      "\n* Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. \n  Example: 12:34:56.123456789."
    );
    console.log("\n* Don't leave any empty lines.");
    return endTrigger();
  }

  // Remove the name of the file.
  const name = arr.shift();

  // Check if the video specified is present in the current directory.
  if (!fs.readdirSync(".").includes(name)) {
    console.log(
      `\n${name} was not found. Make sure to put the correct video filename at the top(Line 1) of timestamps.txt`
    );
    return endTrigger();
  }

  // Get the name of the file excluding its extension.
  const extensionIndex = name.lastIndexOf(".");
  const nameOnly = name.slice(0, extensionIndex);

  // Check if input video is in a supported format.
  const supportedExtensions = [
    "webm",
    "mkv",
    "flv",
    "avi",
    "MTS",
    "M2TS",
    "TS",
    "ts",
    "mov",
    "qt",
    "wmv",
    "amv",
    "mp4",
    "m4p",
    "m4v",
    "mpg",
    "mp2",
    "mpeg",
    "mpe",
    "mpv",
    "m2v",
    "svi",
    "3gp",
    "3g2",
  ];
  const extensionName = name.slice(extensionIndex + 1);
  const extensionError = supportedExtensions.indexOf(extensionName);
  if (extensionError === -1) {
    console.log("\nVideo format error.");
    console.log(
      `\nThe video format ${extensionName} you have specified is not supported.`
    );
    console.log("\nOnly the following extensions are supported:\n");
    console.log(supportedExtensions);
    return endTrigger();
  }

  // Split the strings inside the array by whitespaces.
  // The result would be in form: [[timestamp1,timestamp2],[timestamp3,timestamp4],etc]
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

  // Check if the 1st timestamp inside the next subarray is equal to the 2nd timestamp in the previous subarray.
  // i.e., [[00:01:00.000000000,00:05:00.000000000],[00:05:00.00000000,00:10:00.000000000]] will give an error.

  for (let i = 1; i < tsSplit.length; i++) {
    if (tsSplit[i][0] === tsSplit[i - 1][1]) {
      tsError = true;
      console.log(`\nTimestamp error at line ${i + 1} and line ${i + 2}.
    --- Two instances of timestamp [${tsSplit[i - 1][1]}] were found.`);
    }
  }

  if (tsError) return endTrigger();

  let counter = 0;
  let ffmpegScripts = [];

  if (!fs.readdirSync(".").includes(nameOnly)) {
    fs.mkdirSync(nameOnly);
  }

  let videosDirPath = "./" + nameOnly;
  let videosDir = fs.readdirSync(videosDirPath);

  tsSplit.forEach((ts) => {
    counter++;
    let number = "";

    if (counter < 10) {
      number = "00" + counter;
    } else if (counter < 100) {
      number = "0" + counter;
    } else {
      number += `${counter}`;
    }

    // Check first if the fileName already exists. If it does, skip.
    const outputFilename = `${nameOnly}_${number}.${extensionName}`;
    if (videosDir.includes(outputFilename)) return;
    const cmd = `ffmpeg -v warning -stats -ss ${ts[0]} -to ${ts[1]} -i "${name}" -r 60 "${videosDirPath}/${outputFilename}"`;
    ffmpegScripts.push(cmd);
  });

  const options = { stdio: "inherit" };

  console.log("\nExecuting FFmpeg. This may take a while. . .\n");
  let ffmpegRan = false;
  let time1 = Date.now();
  ffmpegScripts.forEach((script) => {
    console.log(script + "\n");
    ffmpegRan = true;
    execSync(script, options);
  });
  let time2 = Date.now();

  // List the files in the current directory again and filter it with video files of the format 'fileName_XYZ.extensionName'
  // where XYZ is the number of the video, i.e., fileName_001.mp4.
  const regexPattern = `${nameOnly}_\\d{3,4}\\.${extensionName}`;
  const regex = new RegExp(regexPattern);
  videosDir = fs.readdirSync(videosDirPath);
  videosDir = videosDir.filter((file) => regex.test(file));

  // Check the duration of each video segments and if the computed duration is almost equal to actual.
  let possibleErrors = [];
  console.log(
    `${ffmpegRan ? "\n" : ""}Checking each video segment's length. . .`
  );

  videosDir.forEach((file, index) => {
    let durationInSeconds = Number(
      execSync(
        `ffprobe -v warning -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videosDirPath}/${file}"`
      ).toString()
    );

    let difference = Math.abs(timeArr[index] - durationInSeconds).toFixed(4);
    let isGreaterThanOne = difference > 1;

    if (isGreaterThanOne) {
      possibleErrors.push(file);
    }
    console.log(
      `\n[\x1b[94m${file}\x1b[0m] Duration: Computed (${sexagesimalFormat(
        timeArr[index]
      )}) vs Actual (${sexagesimalFormat(
        durationInSeconds
      )}). Difference: ${difference} seconds.${
        isGreaterThanOne
          ? "\x1b[31m Possible Error!\x1b[0m"
          : "\x1b[32m Result Okay!\x1b[0m"
      }`
    );
  });

  let mergeVideosArgs = [
    videosDir,
    videosDirPath,
    nameOnly,
    options,
    answer,
    totalTime,
    time2 - time1,
  ];

  if (possibleErrors.length > 0) {
    console.log("\nPlease check the following files for possible errors:\n");
    console.log(possibleErrors);
    console.log(
      "\nNote that small disparities are normal and you may continue if you have not found errors in any video segments."
    );
    rl.question(
      "\nAbort merging videos? (Default: no) | [yes|no]: ",
      function (abort) {
        if (abort === "yes") {
          console.log("\nAborting merging of video segments. . .");
          return endTrigger();
        } else {
          mergeVideos(...mergeVideosArgs);
        }
      }
    );
  } else {
    console.log("\nNo problems were found with the video segments.");
    mergeVideos(...mergeVideosArgs);
  }
};

rl.question(
  "\nKeep all video segments? (Default: yes) | [yes|no]: ",
  function (answer) {
    trimFunction(answer);
  }
);
