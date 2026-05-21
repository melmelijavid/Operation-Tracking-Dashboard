// Tiny helper for throwing errors that the global errorHandler will translate
// into HTTP responses with the right status code.
//
//   throw httpError(404, 'Ticket not found.');
//
// errorHandler.js looks for `err.status` and uses `err.message`.

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
