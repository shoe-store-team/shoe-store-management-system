import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './config/prisma';
import productRouter from './modules/products/product.router';

const app = express();

app.use(cors());
app.use(express.json());

// Kiểm tra server
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Shoe Store API đang chạy thành công!' });
});

// Kiểm tra database
app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', message: 'Kết nối PostgreSQL thành công!' });
  } catch (error) {
    console.error('Lỗi kết nối database:', error);
    res.status(500).json({ status: 'error', message: 'Không kết nối được PostgreSQL' });
  }
});

// Đăng ký module sản phẩm
app.use('/api/products', productRouter);

export default app;