import {beforeEach} from "vitest";
import {vol} from "memfs";

beforeEach(() => {
    vol.reset()
    vol.mkdirSync(process.cwd(), {recursive: true})
})