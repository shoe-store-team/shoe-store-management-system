import app from './app';
import { expirePendingPayments } from './modules/payments/payment.service';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);

  // Kiểm tra đơn VNPAY hết hạn ngay khi Backend khởi động.
  void expirePendingPayments();

  // Tự động kiểm tra mỗi phút.
  setInterval(() => {
    void expirePendingPayments();
  }, 60_000);
});