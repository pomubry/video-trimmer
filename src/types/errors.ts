export class EndLogError extends Error {
    #errors: string[] = [];

    constructor() {
        super();

        this.name = this.constructor.name;
        this.#errors = [];

        // (Node.js/V8 only) Remove the constructor from the stack trace
        // if (Error.captureStackTrace) {
        //     Error.captureStackTrace(this, this.constructor);
        // }
    }

    addError = (error: string) => {
        this.#errors.push(error);
    }

    logErrors = () => {
        this.#errors.forEach(error => console.error(error));
    }
}
