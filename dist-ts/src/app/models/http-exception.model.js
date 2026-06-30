"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpException extends Error {
    constructor(errorCode, message) {
        super(message);
        this.message = message;
        this.errorCode = errorCode;
    }
}
exports.default = HttpException;
//# sourceMappingURL=http-exception.model.js.map