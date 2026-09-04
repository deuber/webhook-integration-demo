// The webhook signature check needs the exact raw request bytes GitHub
// signed — not a re-serialized JSON.parse'd version, which can differ in
// whitespace/key order. server.ts captures it via express.json's `verify`
// hook and attaches it here.
declare namespace Express {
  export interface Request {
    rawBody: Buffer;
  }
}
