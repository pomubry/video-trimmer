import {describe, expect, test} from "vitest";
import {checkFileExtension, checkVideoFilename} from "./validator.js";

describe("Validation", () => {
    test("Should throw with invalid input", () => {
        expect(() => checkFileExtension("input.exe")).toThrow(/(?=.*exe is not supported)(?=.*Only the following extensions are valid)/is)
    })

    test("Should not throw with valid input", () => {
        expect(() => checkFileExtension("input.mp4")).not.toThrow()
    })

    test("Should throw with invalid input video characters", () => {
        expect(() => checkVideoFilename("input(shouldHaveNoParenthesis).mp4")).toThrow();
        expect(() => checkVideoFilename("inputShouldHaveNoParenthesis.mp4")).not.toThrow();
    })
})
