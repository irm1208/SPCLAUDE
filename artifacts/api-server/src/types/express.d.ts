declare namespace Express {
  interface Request {
    params: Record<string, string>;
  }
}
