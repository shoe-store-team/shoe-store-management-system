import { Prisma, type Promotion } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../common/http";

const normalizeCode = (code: unknown): string => {
  if (typeof code !== "string" || !code.trim())
    throw new HttpError(400, "Vui lòng nhập mã giảm giá");
  return code.trim().toUpperCase();
};

/**
 * Tính số tiền giảm (VND, làm tròn xuống).
 * PERCENTAGE: subtotal * value / 100, không vượt maxDiscount (nếu có).
 * FIXED_AMOUNT: value. Mọi trường hợp không vượt subtotal.
 * M4 dùng lại hàm này khi tạo đơn để hai bên không lệch công thức.
 */
export function calculateDiscount(
  promo: Promotion,
  subtotal: Prisma.Decimal,
): Prisma.Decimal {
  let discount =
    promo.discountType === "PERCENTAGE"
      ? subtotal.mul(promo.discountValue).div(100)
      : promo.discountValue;
  if (promo.discountType === "PERCENTAGE" && promo.maxDiscount) {
    discount = Prisma.Decimal.min(discount, promo.maxDiscount);
  }
  return Prisma.Decimal.min(discount, subtotal).floor();
}

/** Kiểm tra điều kiện voucher; ném HttpError kèm lý do nếu không hợp lệ. */
export function assertPromotionUsable(
  promo: Promotion | null,
  subtotal: Prisma.Decimal,
  now = new Date(),
) {
  if (!promo) throw new HttpError(404, "Mã giảm giá không tồn tại");
  if (!promo.isActive) throw new HttpError(400, "Mã giảm giá đã bị tắt");
  if (now < promo.startsAt)
    throw new HttpError(400, "Mã giảm giá chưa có hiệu lực");
  if (now > promo.endsAt) throw new HttpError(400, "Mã giảm giá đã hết hạn");
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    throw new HttpError(400, "Mã giảm giá đã hết lượt sử dụng");
  }
  if (subtotal.lte(0)) throw new HttpError(400, "Giỏ hàng đang trống");
  if (subtotal.lt(promo.minOrderAmount)) {
    throw new HttpError(
      400,
      `Đơn tối thiểu ${promo.minOrderAmount.toString()}đ để dùng mã này`,
    );
  }
}

/** Dùng cho POST /promotions/validate: tính giảm giá trên giỏ hiện tại. */
export async function validateForSubtotal(
  code: unknown,
  subtotalNumber: number,
) {
  const normalized = normalizeCode(code);
  const subtotal = new Prisma.Decimal(subtotalNumber);
  const promo = await prisma.promotion.findUnique({
    where: { code: normalized },
  });
  assertPromotionUsable(promo, subtotal);
  const discountAmount = calculateDiscount(promo!, subtotal);
  return {
    code: promo!.code,
    name: promo!.name,
    subtotal: subtotal.toNumber(),
    discountAmount: discountAmount.toNumber(),
    total: subtotal.sub(discountAmount).toNumber(),
  };
}

// ---------- Admin CRUD ----------

const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"];
type PromotionInput = {
  code?: unknown;
  name?: unknown;
  description?: unknown;
  discountType?: unknown;
  discountValue?: unknown;
  maxDiscount?: unknown;
  minOrderAmount?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  usageLimit?: unknown;
  isActive?: unknown;
};
// function parseInput(body: unknown, partial: boolean) {
//   const data: Prisma.PromotionUncheckedCreateInput = {};
//   const need = (k: string) => {
//     if (!partial && body?.[k] === undefined) throw new HttpError(400, `Thiếu trường ${k}`);
//     return body?.[k] !== undefined;
//   };

//   if (need('code')) data.code = normalizeCode(body.code);
//   if (need('name')) data.name = String(body.name).trim();
//   if (body?.description !== undefined) data.description = body.description;
//   if (need('discountType')) {
//     if (!DISCOUNT_TYPES.includes(body.discountType)) throw new HttpError(400, 'discountType không hợp lệ');
//     data.discountType = body.discountType;
//   }
//   if (need('discountValue')) {
//     if (!(Number(body.discountValue) > 0)) throw new HttpError(400, 'discountValue phải > 0');
//     data.discountValue = new Prisma.Decimal(body.discountValue);
//   }
//   if (body?.maxDiscount !== undefined) data.maxDiscount = body.maxDiscount === null ? null : new Prisma.Decimal(body.maxDiscount);
//   if (body?.minOrderAmount !== undefined) data.minOrderAmount = new Prisma.Decimal(body.minOrderAmount);
//   if (need('startsAt')) data.startsAt = new Date(body.startsAt);
//   if (need('endsAt')) data.endsAt = new Date(body.endsAt);
//   if (body?.usageLimit !== undefined) data.usageLimit = body.usageLimit;
//   if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

//   if (data.discountType === 'PERCENTAGE' && Number(data.discountValue) > 100) {    throw new HttpError(400, 'Giảm theo % không được vượt 100');
//   }
//   if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
//     throw new HttpError(400, 'endsAt phải sau startsAt');
//   }
//   return data;
// }
function parseInput(
  body: unknown,
  partial: boolean,
): Prisma.PromotionUncheckedCreateInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Dữ liệu khuyến mãi không hợp lệ");
  }

  const input = body as PromotionInput;
  const data = {} as Prisma.PromotionUncheckedCreateInput;

  const need = (k: keyof PromotionInput) => {
    if (!partial && input[k] === undefined) {
      throw new HttpError(400, `Thiếu trường ${k}`);
    }
    return input[k] !== undefined;
  };

  if (need("code")) data.code = normalizeCode(input.code);
  if (need("name")) data.name = String(input.name).trim();
  if (input.description !== undefined)
    data.description = input.description as string;

  if (need("discountType")) {
    if (!DISCOUNT_TYPES.includes(String(input.discountType))) {
      throw new HttpError(400, "discountType không hợp lệ");
    }
    data.discountType =
      input.discountType as Prisma.PromotionUncheckedCreateInput["discountType"];
  }

  if (need("discountValue")) {
    if (!(Number(input.discountValue) > 0)) {
      throw new HttpError(400, "discountValue phải > 0");
    }
    data.discountValue = new Prisma.Decimal(
      input.discountValue as number | string,
    );
  }

  if (input.maxDiscount !== undefined) {
    data.maxDiscount =
      input.maxDiscount === null
        ? null
        : new Prisma.Decimal(input.maxDiscount as number | string);
  }

  if (input.minOrderAmount !== undefined) {
    data.minOrderAmount = new Prisma.Decimal(
      input.minOrderAmount as number | string,
    );
  }

  if (need("startsAt")) data.startsAt = new Date(String(input.startsAt));
  if (need("endsAt")) data.endsAt = new Date(String(input.endsAt));

  if (input.usageLimit !== undefined) {
    data.usageLimit = input.usageLimit as number | null;
  }

  if (input.isActive !== undefined) {
    data.isActive = Boolean(input.isActive);
  }

  if (data.discountType === "PERCENTAGE" && Number(data.discountValue) > 100) {
    throw new HttpError(400, "Giảm theo % không được vượt 100");
  }

  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    throw new HttpError(400, "endsAt phải sau startsAt");
  }

  return data;
}
export const listPromotions = () =>
  prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

export async function createPromotion(body: unknown) {
  const data = parseInput(body, false);
  try {
    return await prisma.promotion.create({ data });
  } catch (e: unknown) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpError(409, "Mã giảm giá đã tồn tại");
    }
    throw e;
  }
}

export async function updatePromotion(id: string, body: unknown) {
  const data = parseInput(body, true);
  try {
    return await prisma.promotion.update({ where: { id }, data });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025")
        throw new HttpError(404, "Không tìm thấy khuyến mãi");
      if (e.code === "P2002")
        throw new HttpError(409, "Mã giảm giá đã tồn tại");
    }
    throw e;
  }
}

/** Không xóa cứng vì đơn cũ còn tham chiếu; chỉ tắt. */
export async function deactivatePromotion(id: string) {
  return updatePromotion(id, { isActive: false });
}
