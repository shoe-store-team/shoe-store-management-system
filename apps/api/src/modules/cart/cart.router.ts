import { Request, Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { idParam, wrap } from '../common/http';
import * as cart from './cart.service';

const router = Router();

// Mọi thao tác giỏ hàng đều cần đăng nhập (token JWT của nhóm)
router.use(authenticateToken);

// authenticateToken đã gắn req.authUser nên chắc chắn có id ở các handler bên dưới
const userId = (req: Request) => req.authUser!.id;

// GET /api/cart
router.get('/', wrap(async (req, res) => {
  res.json(await cart.getCart(userId(req)));
}));

// POST /api/cart/items  { variantId, quantity }
router.post('/items', wrap(async (req, res) => {
  const { variantId, quantity } = req.body ?? {};
  res.status(201).json(await cart.addItem(userId(req), variantId, quantity));
}));

// PATCH /api/cart/items/:id  { quantity }
router.patch('/items/:id', wrap(async (req, res) => {
  res.json(await cart.updateItem(userId(req), idParam(req), req.body?.quantity));
}));

// DELETE /api/cart/items/:id
router.delete('/items/:id', wrap(async (req, res) => {
  res.json(await cart.removeItem(userId(req), idParam(req)));
}));

export default router;