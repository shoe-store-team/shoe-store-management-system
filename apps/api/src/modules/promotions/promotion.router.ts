import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';
import { getCart } from '../cart/cart.service';
import { idParam, wrap } from '../common/http';
import * as promo from './promotion.service';

const router = Router();

// Cần đăng nhập cho cả kiểm tra voucher lẫn quản trị
router.use(authenticateToken);

// POST /api/promotions/validate  { code } -> subtotal lấy từ giỏ ở server
router.post('/validate', wrap(async (req, res) => {
      const cart = await getCart(req.authUser!.id);
  res.json(await promo.validateForSubtotal(req.body?.code, cart.payableSubtotal));
}));

// ---- Admin (quyền lấy từ token qua authorizeRoles của nhóm) ----
router.get('/', authorizeRoles('ADMIN'), wrap(async (_req, res) => {
  res.json(await promo.listPromotions());
}));

router.post('/', authorizeRoles('ADMIN'), wrap(async (req, res) => {
  res.status(201).json(await promo.createPromotion(req.body));
}));

router.patch('/:id', authorizeRoles('ADMIN'), wrap(async (req, res) => {
  res.json(await promo.updatePromotion(idParam(req), req.body));
}));

router.delete('/:id', authorizeRoles('ADMIN'), wrap(async (req, res) => {
  res.json(await promo.deactivatePromotion(idParam(req)));
}));

export default router;