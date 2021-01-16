const fs = require('fs');
const { exec } = require('child_process');
const { stdout, stderr } = require('process');

let ts = '';

ts += fs.readFileSync('ts.txt');
if (ts.length === 0) return console.log('timestamps not found');

ts = ts.replace(/\r/g, '');
let arr = ts.split(/\n/g);
const name = arr.shift();

// Check for input video error
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
const nameExtension = name.slice(name.indexOf('.') + 1);
const nameError = supportedExtensions.indexOf(nameExtension);
if (nameError === -1) return console.log('Wrong video format.');

// Check for timestamps errors
let tsError = '';

let tsSplit = arr.map((ts) => ts.split(/\s/));
for (let i = 1; i < tsSplit.length; i++) {
  if (tsSplit[i][0] === tsSplit[i - 1][1]) {
    tsError += `Error at indexes ${i - 1 + 2} & ${i + 2}.
  --- [Index ${i - 1 + 2}: ${
      tsSplit[i - 1][1]
    }] should not be equal to [Index ${i + 2}: ${tsSplit[i][0]}].\n\n`;
  }
}
arr.map((ts, index) => {
  let times = ts.split(/\s/g);
  let time01 = times[0].split(':');
  let time02 = times[1].split(':');
  let time01Seconds = time01.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
  let time02Seconds = time02.reduce(
    (acc, current, index) => acc + Number(current) * Math.pow(60, 2 - index),
    0
  );
  if (time02Seconds <= time01Seconds) {
    tsError += `Error at index ${index + 2}. 
  --- Timestamp [${times[1]}] should be greater than [${times[0]}].\n\n`;
  }
});
if (tsError) return console.log(tsError.replace(/\n{2}$/, ''));

// This is per batch
let arrCopy = [...arr];
let parentArr = [];
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
    str += ` -ss ${to} output${number}.mp4`;
    counter++;
  });
  str += '\n';
  bash += str;
});

const extensionIndex = name.indexOf('.');
const nameOnly = name.slice(0, extensionIndex);

bash += `rm ${name}
printf "file '%s'\\n" ./*.mp4 > mylist.txt
ffmpeg -f concat -safe 0 -i mylist.txt -c copy output.mp4
mv output.mp4 ${nameOnly}.mp4
rm mylist.txt
rm ${nameOnly}.sh`;

fs.writeFile(`${nameOnly}.sh`, bash, (e) => {
  if (e) return console.log(e);
  console.log(`${nameOnly}.sh has been created.
Executing ${nameOnly}.sh...`);

  exec(`${nameOnly}.sh`, (err, stdout, stderr) => {
    if (err) return console.log(err);
  });
});
