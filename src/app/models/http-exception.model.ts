export interface ErrorPayload {
  errors: Record<string, string[]>;
}

class HttpException extends Error {
  errorCode: number;
  // Error.message is inherited as `string`, so TypeScript won't let a
  // subclass narrow it to ErrorPayload directly — the real type-checking
  // happens on the constructor parameter below, which is what every call
  // site actually goes through.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;

  constructor(errorCode: number, payload: ErrorPayload) {
    super(JSON.stringify(payload));
    this.name = 'HttpException';
    // .stack is a lazily-computed getter that reads the CURRENT this.message
    // on first access, not the string passed to super() above — force it to
    // memoize now (while this.message is still that string) so the stack's
    // header line stays readable instead of "[object Object]" once
    // this.message below is overwritten with the structured payload that
    // callers actually read.
    void this.stack;
    this.errorCode = errorCode;
    this.message = payload;
  }
}

export default HttpException;
