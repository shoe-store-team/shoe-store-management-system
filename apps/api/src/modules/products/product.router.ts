import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: true
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Lỗi lấy danh sách sản phẩm:', error);
    res.status(500).json({ message: 'Không lấy được danh sách sản phẩm' });
  }
});

// POST /api/products
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, basePrice, categoryId, size, color, stock } = req.body;

    if (
      typeof name !== 'string' ||
      name.trim() === '' ||
      typeof basePrice !== 'number' ||
      !Number.isFinite(basePrice) ||
      basePrice <= 0 ||
      !Number.isInteger(size) ||
      size <= 0 ||
      typeof color !== 'string' ||
      color.trim() === '' ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      (categoryId !== undefined && categoryId !== null && typeof categoryId !== 'string')
    ) {
      return res.status(400).json({ message: 'Dữ liệu sản phẩm không hợp lệ' });
    }

    const sanPhamMoi = await prisma.product.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' ? description : null,
        basePrice,
        categoryId: categoryId || null,
        variants: {
          create: {
            size,
            color: color.trim(),
            stock
          }
        }
      },
      include: {
        category: true,
        variants: true
      }
    });

    return res.status(201).json({
      message: 'Thêm sản phẩm thành công',
      product: sanPhamMoi
    });
  } catch (error) {
    console.error('Lỗi thêm sản phẩm:', error);
    return res.status(500).json({ message: 'Không thể thêm sản phẩm' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }

    const { name, description, basePrice, categoryId } = req.body;

    if (
      typeof name !== 'string' ||
      name.trim() === '' ||
      typeof basePrice !== 'number' ||
      !Number.isFinite(basePrice) ||
      basePrice <= 0 ||
      (description !== undefined && description !== null && typeof description !== 'string') ||
      (categoryId !== undefined && categoryId !== null && typeof categoryId !== 'string')
    ) {
      return res.status(400).json({ message: 'Dữ liệu sửa sản phẩm không hợp lệ' });
    }

    const sanPham = await prisma.product.findUnique({ where: { id } });
    if (!sanPham) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    const sanPhamDaSua = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        basePrice,
        description: description === undefined ? sanPham.description : description,
        categoryId: categoryId === undefined ? sanPham.categoryId : categoryId
      },
      include: {
        category: true,
        variants: true
      }
    });

    return res.json({
      message: 'Cập nhật sản phẩm thành công',
      product: sanPhamDaSua
    });
  } catch (error) {
    console.error('Lỗi sửa sản phẩm:', error);
    return res.status(500).json({ message: 'Không thể cập nhật sản phẩm' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }

    const sanPham = await prisma.product.findUnique({ where: { id } });
    if (!sanPham) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    await prisma.product.delete({ where: { id } });

    return res.json({
      message: 'Xóa sản phẩm thành công',
      product: sanPham
    });
  } catch (error) {
    console.error('Lỗi xóa sản phẩm:', error);
    return res.status(500).json({ message: 'Không thể xóa sản phẩm' });
  }
});

export default router;