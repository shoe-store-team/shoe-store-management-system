import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../common/http';

const itemInclude = Prisma.validator<Prisma.CartItemInclude>()({
  variant: { include: { product: true } },
});
type CartItemFull = Prisma.CartItemGetPayload<{ include: typeof itemInclude }>;

/** Giá hiệu lực của biến thể: priceOverride nếu có, ngược lại basePrice. */
export const effectivePrice = (v: CartItemFull['variant']): Prisma.Decimal =>
  v.priceOverride ?? v.product.basePrice;

const assertQuantity = (q: unknown): number => {
  if (typeof q !== 'number' || !Number.isInteger(q) || q < 1) {
    throw new HttpError(400, 'Số lượng phải là số nguyên >= 1');
  }
  return q;
};

const toDto = (items: CartItemFull[]) => {
  const lines = items.map((it) => {
    const unitPrice = effectivePrice(it.variant);
    const sellable = it.variant.isActive && it.variant.product.isActive;
    return {
      id: it.id,
      variantId: it.variantId,
      productId: it.variant.productId,
      productName: it.variant.product.name,
      imageUrl: it.variant.product.imageUrl,
      size: it.variant.size,
      color: it.variant.color,
      unitPrice: unitPrice.toNumber(),
      quantity: it.quantity,
      lineTotal: unitPrice.mul(it.quantity).toNumber(),
      stock: it.variant.stock,
      // false nếu ngừng bán hoặc tồn kho không đủ -> FE cảnh báo, không cho thanh toán
      available: sellable && it.quantity <= it.variant.stock,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return { items: lines, itemCount: lines.length, subtotal };
};

export async function getCart(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: itemInclude,
    orderBy: { createdAt: 'asc' },
  });
  return toDto(items);
}

export async function addItem(userId: string, variantId: unknown, quantity: unknown) {
  if (typeof variantId !== 'string' || !variantId) throw new HttpError(400, 'Thiếu variantId');
  const qty = assertQuantity(quantity);

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || !variant.isActive || !variant.product.isActive) {
    throw new HttpError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  }

  const existing = await prisma.cartItem.findUnique({
    where: { userId_variantId: { userId, variantId } },
  });
  const newQty = (existing?.quantity ?? 0) + qty;
  if (newQty > variant.stock) {
    throw new HttpError(400, `Chỉ còn ${variant.stock} sản phẩm trong kho`);
  }

  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId, variantId } },
    create: { userId, variantId, quantity: qty },
    update: { quantity: newQty },
  });
  return getCart(userId);
}

export async function updateItem(userId: string, itemId: string, quantity: unknown) {
  const qty = assertQuantity(quantity);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, userId },
    include: { variant: true },
  });
  if (!item) throw new HttpError(404, 'Không tìm thấy dòng giỏ hàng');
  if (qty > item.variant.stock) {
    throw new HttpError(400, `Chỉ còn ${item.variant.stock} sản phẩm trong kho`);
  }
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: qty } });
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const { count } = await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
  if (count === 0) throw new HttpError(404, 'Không tìm thấy dòng giỏ hàng');
  return getCart(userId);
}
