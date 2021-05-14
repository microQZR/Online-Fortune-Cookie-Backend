class httpError extends Error {
  constructor(message, errorCode) {
    super(message);
    this.status = errorCode;
  }
}

module.exports = httpError;
