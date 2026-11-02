import { Router } from 'express';
import { getCart } from '../cart/cart.service';
import { assertAdmin, currentUserId, idParam, wrap } from '../common/http';
import * as promo from './promotion.service';

const router = Router();

// POST /api/promotions/validate  { code } -> subtotal lấy từ giỏ ở server
router.post('/validate', wrap(async (req, res) => {
  const cart = await getCart(currentUserId(req));
  res.json(await promo.validateForSubtotal(req.body?.code, cart.subtotal));
}));

// ---- Admin ----
router.get('/', wrap(async (req, res) => {
  await assertAdmin(req);
  res.json(await promo.listPromotions());
}));

router.post('/', wrap(async (req, res) => {
  await assertAdmin(req);
  res.status(201).json(await promo.createPromotion(req.body));
}));

router.patch('/:id', wrap(async (req, res) => {
  await assertAdmin(req);
  res.json(await promo.updatePromotion(idParam(req), req.body));
}));

router.delete('/:id', wrap(async (req, res) => {
  await assertAdmin(req);
  res.json(await promo.deactivatePromotion(idParam(req)));
}));

export default router;
