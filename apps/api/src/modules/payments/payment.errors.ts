/** Lỗi nghiệp vụ của module thanh toán (có mã HTTP). Module tự bắt lỗi này, không phụ thuộc error.middleware của nhóm. */
export class PaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
