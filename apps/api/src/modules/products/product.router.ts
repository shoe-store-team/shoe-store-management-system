
import { Router, Request, Response } from 'express';

import {
  layTatCaSanPham,
  laySanPhamTheoId,
  taoSanPham,
  capNhatSanPham,
  xoaSanPham,
  ProductServiceError
} from './product.service';

const router = Router();

// Xử lý lỗi chung từ Service.
function xuLyLoi(res: Response, error: unknown) {
  console.error('Lỗi Product API:', error);

  if (error instanceof ProductServiceError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  return res.status(500).json({
    message: 'Đã xảy ra lỗi khi xử lý sản phẩm.'
  });
}

// GET /api/products
router.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await layTatCaSanPham();
    return res.json(products);
  } catch (error) {
    return xuLyLoi(res, error);
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (typeof id !== 'string') {
      return res.status(400).json({
        message: 'ID sản phẩm không hợp lệ.'
      });
    }

    const product = await laySanPhamTheoId(id);
    return res.json({ product });
  } catch (error) {
    return xuLyLoi(res, error);
  }
});

// POST /api/products
router.post('/', async (req: Request, res: Response) => {
  try {
    const product = await taoSanPham(req.body);

    return res.status(201).json({
      message: 'Thêm sản phẩm thành công.',
      product
    });
  } catch (error) {
    return xuLyLoi(res, error);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (typeof id !== 'string') {
      return res.status(400).json({
        message: 'ID sản phẩm không hợp lệ.'
      });
    }

    const product = await capNhatSanPham(id, req.body);

    return res.json({
      message: 'Cập nhật sản phẩm thành công.',
      product
    });
  } catch (error) {
    return xuLyLoi(res, error);
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (typeof id !== 'string') {
      return res.status(400).json({
        message: 'ID sản phẩm không hợp lệ.'
      });
    }

    const product = await xoaSanPham(id);

    return res.json({
      message: 'Ngừng kinh doanh sản phẩm thành công.',
      product
    });
  } catch (error) {
    return xuLyLoi(res, error);
  }
});

export default router;
