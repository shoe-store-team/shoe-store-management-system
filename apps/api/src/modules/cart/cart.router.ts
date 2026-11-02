import { Router } from 'express';
import { currentUserId, idParam, wrap } from '../common/http';
import * as cart from './cart.service';

const router = Router();

// GET /api/cart
router.get('/', wrap(async (req, res) => {
  res.json(await cart.getCart(currentUserId(req)));
}));

// POST /api/cart/items  { variantId, quantity }
router.post('/items', wrap(async (req, res) => {
  const { variantId, quantity } = req.body ?? {};
  res.status(201).json(await cart.addItem(currentUserId(req), variantId, quantity));
}));

// PATCH /api/cart/items/:id  { quantity }
router.patch('/items/:id', wrap(async (req, res) => {
  res.json(await cart.updateItem(currentUserId(req), idParam(req), req.body?.quantity));
}));

// DELETE /api/cart/items/:id
router.delete('/items/:id', wrap(async (req, res) => {
  res.json(await cart.removeItem(currentUserId(req), idParam(req)));
}));

export default router;
