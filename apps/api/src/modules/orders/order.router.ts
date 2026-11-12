import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import {
  currentUserId,
  assertAdmin,
  wrap,
  idParam,
} from '../common/http';

import {
  OrderStatus,
} from '@prisma/client';

import * as orderService from './order.service';

const router = Router();
router.use(authenticateToken);

// ==========================================
// 1. TAO DON HANG
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
// 2. LICH SU DON HANG
// GET /api/orders/my-orders
// ==========================================

router.get(
  '/my-orders',
  wrap(async (req, res) => {
    const userId = currentUserId(req);

    const orders = await orderService.getMyOrders(userId);

    res.json({
      data: orders,
    });
  }),
);

// ==========================================
// 3. ADMIN LAY TAT CA DON HANG
// GET /api/orders
// ==========================================

router.get(
  '/',
  wrap(async (req, res) => {
    await assertAdmin(req);

    const status = req.query.status;

    if (
      status !== undefined &&
      (typeof status !== 'string' ||
        !Object.values(OrderStatus).includes(
          status as OrderStatus,
        ))
    ) {
      res.status(400).json({
        message: 'Trang thai don hang khong hop le',
      });
      return;
    }

    const orders = await orderService.getAllOrders(
      status as OrderStatus | undefined,
    );

    res.json({
      data: orders,
    });
  }),
);

// ==========================================
// 4. XEM CHI TIET DON HANG
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
      data: order,
    });
  }),
);

// ==========================================
// 5. CAP NHAT TRANG THAI DON HANG
// PATCH /api/orders/:id/status
// ==========================================

router.patch(
  '/:id/status',
  wrap(async (req, res) => {
    await assertAdmin(req);

    const orderId = idParam(req);
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(
      orderId,
      status,
    );

    res.json({
      message: 'Cap nhat trang thai thanh cong',
      data: order,
    });
  }),
);

// ==========================================
// 6. HUY DON HANG
// PATCH /api/orders/:id/cancel
// ==========================================

router.patch(
  '/:id/cancel',
  wrap(async (req, res) => {
    const userId = currentUserId(req);

    const order = await orderService.cancelOrder(
      userId,
      idParam(req),
    );

    res.json({
      message: 'Huy don hang thanh cong',
      data: order,
    });
  }),
);

export default router;