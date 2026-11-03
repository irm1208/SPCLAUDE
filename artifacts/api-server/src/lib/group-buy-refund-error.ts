export class GroupBuyRefundError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = "GroupBuyRefundError";
    this.code = code;
  }
}
