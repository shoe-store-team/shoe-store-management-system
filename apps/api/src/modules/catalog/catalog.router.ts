import { Router, Request, Response } from 'express';
import { idParam, wrap } from '../common/http';
import { getProductDetail } from './catalog.service';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'C module ready' });
});

// GET /api/catalog/:id  -> chi tiết sản phẩm + biến thể (size/màu/giá/tồn)
router.get('/:id', wrap(async (req, res) => {
  res.json(await getProductDetail(idParam(req)));
}));

export default router;
