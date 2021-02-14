const fs = require('fs');
const { execSync } = require('child_process');

let ts = '';

// Read the contents of the ts.txt file. Return an error if its empty.
ts += fs.readFileSync('timestamps.txt');
if (ts.length === 0) return console.log('Timestamps not found');

// Remove carrier return \r and split each timestamps by newlines \n. Filter out the empty lines as well.
ts = ts.replace(/\r/g, '');
let arr = ts.split(/\n/g).filter((timestamp) => timestamp !== '');

// Remove the name of the file.
const name = arr.shift();

// Check if the video specified is present in the current directory.
if (!fs.readdirSync('.').includes(name))
  return console.log(`${name} was not found`);

// Check if input video is in a supported format.
const supportedExtensions = [
  'webm',
  'mkv',
  'flv',
  'avi',
  'MTS',
  'M2TS',
  'TS',
  'ts',
  'mov',
  'qt',
  'wmv',
  'amv',
  'mp4',
  'm4p',
  'm4v',
  'mpg',
  'mp2',
  'mpeg',
  'mpe',
  'mpv',
  'm2v',
  'svi',
  '3gp',
  '3g2',
];
const extensionName = name.slice(name.indexOf('.') + 1);
const extensionError = supportedExtensions.indexOf(extensionName);
if (extensionError === -1)
  return console.log(
    'Video format not supported.',
    'Should be at least one of the following:',
    supportedExtensions
  );

// Split the strings inside the array by whitespaces.
// The result would be in form: [[timestamp1,timestamp2],[timestamp3,timestamp4],etc]
let tsSplit = arr.map((ts) => ts.split(/\s/));

// Check for timestamps errors.
let tsError = '';

// Check if the 1st timestamp inside the next subarray is equal to the 2nd timestamp in the previous subarray.
// i.e., [[00:01:00.000000000,00:05:00.000000000],[00:05:00.00000000,00:10:00.000000000]] will give an error.
for (let i = 1; i < tsSplit.length; i++) {
  if (tsSplit[i][0] === tsSplit[i - 1][1]) {
    tsError += `Timestamp Error.
  --- Two instances of timestamp [${
    tsSplit[i - 1][1]
  }] was found next to each other.\n\n`;
  }
}

// Check if the 2nd timestamp in each index is lower than the 1st timestamp. Each index will be split first by whitespace to make it into a subarray.
// i.e., [[00:06:00.000000000,00:05:00.000000000]] will give an error
// because 00:05:00.000000000 is lesser/earlier than 00:06:00.000000000. Time format will be converted to seconds for evaluation.
arr.map((ts) => {
  let times = ts.split(/\s/g);
  let time01 = times[0].split(':');
  let time02 = times[1].split(':');

  // Convert the time string format into seconds.
  let time01Seconds = time01.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
  let time02Seconds = time02.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );

  if (time02Seconds <= time01Seconds) {
    tsError += `Timestamp Error. 
    --- Timestamp [${times[1]}] should be greater than [${times[0]}].\n\n`;
  }
});
if (tsError) return console.log(tsError.replace(/\n{2}$/, ''));

let arrCopy = [...arr];
let parentArr = [];

// Make an array with subarrays containing 15 timestamp pairs in each taken from a copy of 'arr' and store it inside parentArr.
// i.e., [[timestamp1 timestamp2, timestamp3 timestamp4, etc...]]. 'timestamp1 timestamp2' is considered 1 timestamp pair
// and there will be 15 pairs in each subarray.
let childArrNum = Math.ceil(arr.length / 15);
for (let i = 0; i < childArrNum; i++) {
  let childArr = [];
  for (let j = 0; j <= 14; j++) {
    if (arrCopy.length === 0) break;
    childArr.push(arrCopy.shift());
  }
  parentArr.push(childArr);
}

let counter = 0;
let bash = '';

/* Map the parentArr and output a string of commands which will be executed later. 
Example output would be:
ffmpeg -i input.mp4 -ss 00:04:46.987000000 -to 00:05:09.810000000 -r 29970/1000 output000.mp4 -ss 00:05:15.415000000 -to 00:06:00.661000000 -r 29970/1000 output001.mp4 -ss 00:06:02.095000000 -to 00:06:11.205000000 -r 29970/1000 output002.mp4 -ss 00:06:12.406000000 -to 00:06:20.013000000 -r 29970/1000 output003.mp4 -ss 00:06:24.751000000 -to 00:06:43.036000000 -r 29970/1000 output004.mp4 -ss 00:07:08.562000000 -to 00:07:19.573000000 -r 29970/1000 output005.mp4 -ss 00:07:49.102000000 -to 00:07:59.813000000 -r 29970/1000 output006.mp4 -ss 00:08:12.793000000 -to 00:08:29.176000000 -r 29970/1000 output007.mp4 -ss 00:08:35.582000000 -to 00:08:47.227000000 -r 29970/1000 output008.mp4 -ss 00:12:32.920000000 -to 00:13:03.984000000 -r 29970/1000 output009.mp4 -ss 00:13:18.232000000 -to 00:13:23.737000000 -r 29970/1000 output010.mp4 -ss 00:13:54.902000000 -to 00:14:23.697000000 -r 29970/1000 output011.mp4 -ss 00:14:26.934000000 -to 00:14:56.463000000 -r 29970/1000 output012.mp4 -ss 00:15:18.886000000 -to 00:16:12.139000000 -r 29970/1000 output013.mp4 -ss 00:16:19.746000000 -to 00:16:31.792000000 -r 29970/1000 output014.mp4
ffmpeg -i input.mp4 -ss 00:16:39.600000000 -to 00:16:47.407000000 -r 29970/1000 output015.mp4 -ss 00:16:54.281000000 -to 00:16:59.086000000 -r 29970/1000 output016.mp4 -ss 00:17:34.755000000 -to 00:17:49.303000000 -r 29970/1000 output017.mp4 -ss 00:18:05.719000000 -to 00:18:39.086000000 -r 29970/1000 output018.mp4 -ss 00:19:00.941000000 -to 00:19:17.624000000 -r 29970/1000 output019.mp4 -ss 00:22:36.423000000 -to 00:22:56.410000000 -r 29970/1000 output020.mp4 -ss 00:23:17.097000000 -to 00:23:38.252000000 -r 29970/1000 output021.mp4 -ss 00:23:50.898000000 -to 00:24:04.545000000 -r 29970/1000 output022.mp4 -ss 00:25:57.891000000 -to 00:26:12.005000000 -r 29970/1000 output023.mp4 -ss 00:34:59.867000000 -to 00:35:04.738000000 -r 29970/1000 output024.mp4 -ss 00:35:57.391000000 -to 00:36:20.914000000 -r 29970/1000 output025.mp4 -ss 00:37:00.621000000 -to 00:37:17.804000000 -r 29970/1000 output026.mp4 -ss 00:37:21.708000000 -to 00:37:35.355000000 -r 29970/1000 output027.mp4 -ss 00:45:53.353000000 -to 00:46:25.085000000 -r 29970/1000 output028.mp4 -ss 00:55:20.120000000 -to 00:55:42.276000000 -r 29970/1000 output029.mp4
etc...
*/
parentArr.map((arr) => {
  let str = `ffmpeg -i ${name}`;
  arr.map((ts) => {
    let to = ts.replace(/\s/g, ' -to ');
    let number = '';
    if (counter < 10) {
      number = '00' + counter;
    } else if (counter < 100) {
      number = '0' + counter;
    } else {
      number += `${counter}`;
    }
    str += ` -ss ${to} -r 29970/1000 output${number}.${extensionName}`;
    counter++;
  });
  str += '\n';
  bash += str;
});

// Get the name of the file excluding its extension.
const extensionIndex = name.indexOf('.');
const nameOnly = name.slice(0, extensionIndex);

// Make an .sh file with the 'bash' variable as its contents then execute.
fs.writeFileSync(`${nameOnly}.sh`, bash);
console.log(`${nameOnly}.sh has been created.\n`);
console.log(`Executing ${nameOnly}.sh. This may take a while...\n`);

const options = { stdio: 'inherit' };
execSync(`${nameOnly}.sh`, options);

// List the files in the current directory and filter it with video files of the format 'outputxyz.extensionName'
// where xyz is the number of the video, i.e., output001.mp4.
let files = fs.readdirSync('.');
const regexPattern = `output\\d{3}\\.${extensionName}`;
const regex = new RegExp(regexPattern);
files = files.filter((file) => file.match(regex));

// List the relative path of each video files and save it into mylist.txt
let myList = '';
files.forEach(
  (file, index) => (myList += `${index !== 0 ? '\n' : ''}file './${file}'`)
);
fs.writeFileSync('mylist.txt', myList);

// Concatenate all the videos listed in the mylist.txt then remove the .sh file that was created earlier.
execSync(
  `ffmpeg -f concat -safe 0 -i mylist.txt -c copy ${nameOnly}(Result).mp4`,
  options
);
console.log(`\n${nameOnly}(Result).mp4 has been created.\n`);
execSync(`rm ${nameOnly}.sh`, options);

// Remove mylist.txt.
console.log('Removing mylist.txt\n');
fs.unlinkSync('mylist.txt');

// Remove the video segments that were created in the process.
console.log('Removing video segments:\n');
files.forEach((path) => {
  console.log('./' + path);
  fs.unlinkSync('./' + path);
});
