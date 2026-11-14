import { prisma } from '../../config/prisma';
import { HttpError } from '../common/http';

/** Chi tiết sản phẩm cho khách: chỉ biến thể đang bán, giá hiệu lực đã tính sẵn. */
export async function getProductDetail(id: string) {
  const p = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      category: true,
      variants: { where: { isActive: true }, orderBy: [{ color: 'asc' }, { size: 'asc' }] },
    },
  });
  if (!p) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    basePrice: p.basePrice.toNumber(),
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      imageUrl: v.imageUrl,
      price: (v.priceOverride ?? p.basePrice).toNumber(),
      stock: v.stock,
    })),
  };
}
