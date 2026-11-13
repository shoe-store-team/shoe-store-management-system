import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import {
  currentUserId,
  assertAdmin,
  wrap,
  idParam,
  HttpError,
} from '../common/http';

import {
  OrderStatus,
} from '@prisma/client';

import * as orderService from './order.service';

const router = Router();
router.use(authenticateToken);

// ==========================================
// 1. TẠO ĐƠN HÀNG
// POST /api/orders
// ==========================================

router.post(
  '/',
  wrap(async (req, res) => {
    const userId = currentUserId(req);

    const order = await orderService.createOrder(
      userId,
      req.body,
    );

    res.status(201).json({
      message: 'Tao don hang thanh cong',
      data: order,
    });
  }),
);

// ==========================================
// 2. LẤY LỊCH SỬ ĐƠN HÀNG CỦA KHÁCH
// GET /api/orders/my-orders
// ==========================================

router.get(
  '/my-orders',
  wrap(async (req, res) => {
    const userId = currentUserId(req);

    const orders = await orderService.getMyOrders(userId);

    res.json({
      message: 'Lay lich su don hang thanh cong',
      data: orders,
    });
  }),
);

// ==========================================
// 3. ADMIN LẤY TẤT CẢ ĐƠN HÀNG
// GET /api/orders
// ==========================================

router.get(
  '/',
  wrap(async (req, res) => {
    await assertAdmin(req);

    const status = req.query.status;

    // Kiểm tra trạng thái nếu có truyền lên
    if (
      status !== undefined &&
      (
        typeof status !== 'string' ||
        !Object.values(OrderStatus).includes(
          status as OrderStatus,
        )
      )
    ) {
      throw new HttpError(
        400,
        'Trang thai don hang khong hop le',
      );
    }

    const orders = await orderService.getAllOrders(
      status as OrderStatus | undefined,
    );

    res.json({
      message: 'Lay danh sach don hang thanh cong',
      data: orders,
    });
  }),
);

// ==========================================
// 4. XEM CHI TIẾT ĐƠN HÀNG
// GET /api/orders/:id
// ==========================================

router.get(
  '/:id',
  wrap(async (req, res) => {
    const userId = currentUserId(req);
    const orderId = idParam(req);

    const order = await orderService.getOrderDetail(
      userId,
      orderId,
    );

    res.json({
      message: 'Lay chi tiet don hang thanh cong',
      data: order,
    });
  }),
);

// ==========================================
// 5. ADMIN CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
// PATCH /api/orders/:id/status
// ==========================================

router.patch(
  '/:id/status',
  wrap(async (req, res) => {
    await assertAdmin(req);

    const orderId = idParam(req);
    const status = req.body?.status;

    // Kiểm tra dữ liệu đầu vào
    if (
      typeof status !== 'string' ||
      !Object.values(OrderStatus).includes(
        status as OrderStatus,
      )
    ) {
      throw new HttpError(
        400,
        'Trang thai don hang khong hop le',
      );
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status as OrderStatus,
    );

    res.json({
      message: 'Cap nhat trang thai thanh cong',
      data: order,
    });
  }),
);

// ==========================================
// 6. HỦY ĐƠN HÀNG
// PATCH /api/orders/:id/cancel
// ==========================================

router.patch(
  '/:id/cancel',
  wrap(async (req, res) => {
    const userId = currentUserId(req);
    const orderId = idParam(req);

    let isAdmin = false;

    // Xác định người thực hiện có phải Admin không
    try {
      await assertAdmin(req);
      isAdmin = true;
    } catch (error) {
      // Chỉ bỏ qua lỗi không có quyền Admin.
      // Các lỗi đăng nhập hoặc lỗi khác vẫn phải trả về.
      if (
        !(error instanceof HttpError) ||
        error.status !== 403
      ) {
        throw error;
      }
    }

    const order = await orderService.cancelOrder(
      userId,
      orderId,
      isAdmin,
    );

    res.json({
      message: 'Huy don hang thanh cong',
      data: order,
    });
  }),
);

export default router;