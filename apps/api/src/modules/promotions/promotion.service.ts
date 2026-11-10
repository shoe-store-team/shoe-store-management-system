import { Prisma, type Promotion } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../common/http";

const normalizeCode = (code: unknown): string => {
  if (typeof code !== "string" || !code.trim())
    throw new HttpError(400, "Vui lòng nhập mã giảm giá");
  return code.trim().toUpperCase();
};

/** Chuyển giá trị client gửi lên thành Decimal; sai định dạng -> 400 (không để lọt thành lỗi 500). */
const toDecimal = (v: unknown, field: string, min = 0): Prisma.Decimal => {
  if (typeof v !== "number" && typeof v !== "string")
    throw new HttpError(400, `${field} không hợp lệ`);
  if (typeof v === "string" && !v.trim())
    throw new HttpError(400, `${field} không hợp lệ`);
  let d: Prisma.Decimal;
  try {
    d = new Prisma.Decimal(v);
  } catch {
    throw new HttpError(400, `${field} không hợp lệ`);
  }
  if (!d.isFinite()) throw new HttpError(400, `${field} không hợp lệ`);
  if (d.lt(min)) throw new HttpError(400, `${field} phải >= ${min}`);
  return d;
};

// const toDate = (v: unknown, field: string): Date => {
//   const d = new Date(v as string | number);
//   if (typeof v !== "string" && typeof v !== "number")
//     throw new HttpError(400, `${field} không hợp lệ`);
//   if (Number.isNaN(d.getTime()))
//     throw new HttpError(400, `${field} không hợp lệ`);
//   return d;
// };
const toDate = (v: unknown, field: string): Date => {
  if (typeof v !== "string" && typeof v !== "number") {
    throw new HttpError(400, `${field} không hợp lệ`);
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, `${field} không hợp lệ`);
  }

  return d;
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
    if (subtotal.lt(promo.minOrderAmount)) {
      throw new HttpError(
        400,
        `Đơn tối thiểu ${promo.minOrderAmount.toNumber().toLocaleString("vi-VN")}đ để dùng mã này`,
      );
    }
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

/**
 * DÀNH CHO M4 - gọi trong cùng transaction tạo đơn:
 *   const { promotionId, discountAmount } = await applyPromotionInTx(tx, code, subtotal);
 * `subtotal` phải do SERVER tính từ giỏ/đơn, không lấy từ client.
 * Kiểm tra lại toàn bộ điều kiện và tăng usageCount nguyên tử, nên nhiều đơn cùng lúc
 * cũng không vượt usageLimit.
 */
export async function applyPromotionInTx(
  tx: Prisma.TransactionClient,
  code: unknown,
  subtotal: Prisma.Decimal,
) {
  const promo = await tx.promotion.findUnique({
    where: { code: normalizeCode(code) },
  });
  assertPromotionUsable(promo, subtotal);
  const updated = await tx.$executeRaw`
    UPDATE "Promotion" SET "usageCount" = "usageCount" + 1
    WHERE "id" = ${promo!.id} AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;
  if (updated === 0)
    throw new HttpError(400, "Mã giảm giá đã hết lượt sử dụng");
  return {
    promotionId: promo!.id,
    discountAmount: calculateDiscount(promo!, subtotal),
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

  if (need("name")) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) throw new HttpError(400, "name không được để trống");
    data.name = name;
  }

  if (input.description !== undefined) {
    data.description = input.description as string;
  }

  if (need("discountType")) {
    if (!DISCOUNT_TYPES.includes(String(input.discountType))) {
      throw new HttpError(400, "discountType không hợp lệ");
    }
    data.discountType =
      input.discountType as Prisma.PromotionUncheckedCreateInput["discountType"];
  }

  if (need("discountValue")) {
    const value = toDecimal(input.discountValue, "discountValue");
    if (value.lte(0)) throw new HttpError(400, "discountValue phải > 0");
    data.discountValue = value;
  }

  if (input.maxDiscount !== undefined) {
    data.maxDiscount =
      input.maxDiscount === null
        ? null
        : toDecimal(input.maxDiscount, "maxDiscount");
  }

  if (input.minOrderAmount !== undefined) {
    data.minOrderAmount = toDecimal(input.minOrderAmount, "minOrderAmount");
  }

  if (need("startsAt")) data.startsAt = toDate(input.startsAt, "startsAt");
  if (need("endsAt")) data.endsAt = toDate(input.endsAt, "endsAt");

  if (input.usageLimit !== undefined) {
    if (
      input.usageLimit !== null &&
      !(
        typeof input.usageLimit === "number" &&
        Number.isInteger(input.usageLimit) &&
        input.usageLimit >= 1
      )
    ) {
      throw new HttpError(
        400,
        "usageLimit phải là số nguyên >= 1 (hoặc null nếu không giới hạn)",
      );
    }
    data.usageLimit = input.usageLimit as number | null;
  }

  if (input.isActive !== undefined) {
    data.isActive = Boolean(input.isActive);
  }

  return data;
}

export const listPromotions = () =>
  prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

function assertPromotionShape(s: {
  discountType: string;
  discountValue: Prisma.Decimal;
  startsAt: Date;
  endsAt: Date;
}) {
  if (s.discountType === "PERCENTAGE" && s.discountValue.gt(100)) {
    throw new HttpError(400, "Giảm theo % không được vượt 100");
  }

  if (s.endsAt <= s.startsAt) {
    throw new HttpError(400, "endsAt phải sau startsAt");
  }
}
//
export async function createPromotion(body: unknown) {
  const data = parseInput(body, false);
  assertPromotionShape({
    discountType: data.discountType,
    discountValue: data.discountValue as Prisma.Decimal,
    startsAt: data.startsAt as Date,
    endsAt: data.endsAt as Date,
  });
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
  const touchesShape = [
    "discountType",
    "discountValue",
    "startsAt",
    "endsAt",
  ].some((k) => k in data);
  if (touchesShape) {
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Không tìm thấy khuyến mãi");
    assertPromotionShape({
      discountType:
        (data.discountType as string | undefined) ?? existing.discountType,
      discountValue:
        (data.discountValue as Prisma.Decimal | undefined) ??
        existing.discountValue,
      startsAt: (data.startsAt as Date | undefined) ?? existing.startsAt,
      endsAt: (data.endsAt as Date | undefined) ?? existing.endsAt,
    });
  }
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
