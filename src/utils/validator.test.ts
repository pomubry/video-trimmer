import {describe, expect, test} from "vitest";
import {checkFileExtension} from "./validator.js";

describe("Validation", () => {
    test("Should throw with invalid input", () => {
        expect(() => checkFileExtension("input.exe")).toThrow(/(?=.*exe is not supported)(?=.*Only the following extensions are valid)/is)
    })

    test("Should not throw with valid input", () => {
        expect(() => checkFileExtension("input.mp4")).not.toThrow()
    })
})