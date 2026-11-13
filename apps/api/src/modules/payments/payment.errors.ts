/**
 * Lỗi nghiệp vụ của module thanh toán.
 * Mỗi lỗi có mã HTTP tương ứng.
 */
export class PaymentError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);

    this.name = "PaymentError";
    this.status = status;

    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}