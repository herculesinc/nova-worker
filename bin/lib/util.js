"use strict";
// IMPORTS
// =================================================================================================
const nova_base_1 = require("nova-base");
// ERRORS
// =================================================================================================
class WorkerError extends nova_base_1.Exception {
    constructor(message, cause) {
        super({ message: message, cause: cause });
        this.name = "Worker Error";
    }
}
exports.WorkerError = WorkerError;
//# sourceMappingURL=util.js.map