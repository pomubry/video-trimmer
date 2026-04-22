import readline from "readline";
import type {MergeOptions, ReadlineMergeCallback, ReadlineQA} from "../types/index.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export const readlineQA: ReadlineQA = {
    question: "\nAbort merging videos? (Default: no) | [yes|no]: ",
    answer: "yes" // default
}

export const readlineMerge =
    (readline: ReadlineQA, mergeOptions: MergeOptions, callback: ReadlineMergeCallback) =>
        rl.question(`\n${readline.question}`, (answer) => {
            readline.answer = answer;
            callback(readline.answer, mergeOptions, rl)
        });
