import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './config/prisma';

import authRouter from './modules/auth/auth.router';
import productRouter from './modules/products/product.router';
import catalogRouter from './modules/catalog/catalog.router';
import cartRouter from './modules/cart/cart.router';
import orderRouter from './modules/orders/order.router';
import customerRouter from './modules/customer/customer.router';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Shoe Store API đang chạy thành công!' });
});

app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', message: 'Kết nối PostgreSQL thành công!' });
  } catch (error) {
    console.error('Lỗi kết nối database:', error);
    res.status(500).json({ status: 'error', message: 'Không kết nối được PostgreSQL' });
  }
});

// ĐĂNG KÝ ROUTE CHO 6 THÀNH VIÊN (Không ai cần sửa file này nữa)
app.use('/api/auth', authRouter);           // Người 1: Đăng nhập, đăng ký
app.use('/api/products', productRouter);    // Người 2: Admin CRUD sản phẩm
app.use('/api/catalog', catalogRouter);     // Người 3: Khách xem, lọc, tìm kiếm giày
app.use('/api/cart', cartRouter);           // Người 4: Giỏ hàng & Thanh toán tạo đơn
app.use('/api/orders', orderRouter);        // Người 5: Admin quản lý đơn & Báo cáo
app.use('/api/customer', customerRouter);   // Người 6: Hồ sơ cá nhân & Đơn đã mua

export default app;