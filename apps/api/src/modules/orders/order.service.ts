import { prisma } from '../../config/prisma';
import { HttpError } from '../common/http';

import {
  Prisma,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  InventoryDocumentType,
  InventoryDocumentStatus,
  DiscountType,
} from '@prisma/client';

// ==========================================
// HÀM HỖ TRỢ
// ==========================================

function taoMaPhieuKho(type: InventoryDocumentType): string {
  const stamp = Date.now();
  const random = Math.random()
    .toString(36)
    .slice(2, 9)
    .toUpperCase();

  return `${type}-${stamp}-${random}`;
}

function kiemTraSoDienThoai(phone: string): boolean {
  return /^(0|\+84)[0-9]{9,10}$/.test(
    phone.replace(/\s/g, ''),
  );
}

// Khóa đơn hàng để đồng bộ với payment.service.ts.
// Cả hai nơi phải dùng cùng một khóa.
async function khoaDonHang(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${orderId}::text))
  `;
}

// ==========================================
// 1. TẠO ĐƠN HÀNG
// ==========================================

export async function createOrder(
  userId: string,
  data: {
    recipientName: string;
    phone: string;
    shippingAddress: string;
    addressId?: string;
    note?: string;
    paymentMethod: PaymentMethod;
    promotionCode?: string;
    voucherCode?: string;
  },
) {
  const recipientName = String(data.recipientName ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const shippingAddress = String(data.shippingAddress ?? '').trim();
  const addressId = data.addressId;
  const note = data.note?.trim();
  const paymentMethod = data.paymentMethod;

  const promotionCode = String(
    data.promotionCode ?? data.voucherCode ?? '',
  )
    .trim()
    .toUpperCase();

  if (!recipientName || !phone || !shippingAddress) {
    throw new HttpError(400, 'Thong tin giao hang khong day du');
  }

  if (!kiemTraSoDienThoai(phone)) {
    throw new HttpError(400, 'So dien thoai khong hop le');
  }

  if (
    paymentMethod !== PaymentMethod.COD &&
    paymentMethod !== PaymentMethod.VNPAY
  ) {
    throw new HttpError(400, 'Phuong thuc thanh toan khong duoc ho tro');
  }

  return prisma.$transaction(
    async (tx) => {
      // 1. LẤY GIỎ HÀNG

      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      });

      if (cartItems.length === 0) {
        throw new HttpError(400, 'Gio hang dang trong');
      }

      // 2. KIỂM TRA ĐỊA CHỈ

      if (addressId) {
        const address = await tx.address.findFirst({
          where: {
            id: addressId,
            userId,
          },
        });

        if (!address) {
          throw new HttpError(404, 'Dia chi giao hang khong ton tai');
        }
      }

      // 3. KIỂM TRA SẢN PHẨM VÀ TÍNH TIỀN

      let subtotal = new Prisma.Decimal(0);

      const orderItems: {
        variantId: string;
        productName: string;
        size: number;
        color: string;
        quantity: number;
        price: Prisma.Decimal;
      }[] = [];

      for (const item of cartItems) {
        const variant = item.variant;
        const product = variant.product;

        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new HttpError(400, 'So luong san pham khong hop le');
        }

        if (!variant.isActive) {
          throw new HttpError(
            400,
            `Bien the san pham ${product.name} khong con hoat dong`,
          );
        }

        if (!product.isActive) {
          throw new HttpError(
            400,
            `San pham ${product.name} khong con kinh doanh`,
          );
        }

        const price = new Prisma.Decimal(
          variant.priceOverride ?? product.basePrice,
        );

        if (price.lessThanOrEqualTo(0)) {
          throw new HttpError(400, 'Gia san pham khong hop le');
        }

        subtotal = subtotal.add(price.mul(item.quantity));

        orderItems.push({
          variantId: variant.id,
          productName: product.name,
          size: variant.size,
          color: variant.color,
          quantity: item.quantity,
          price,
        });
      }

      // 4. KIỂM TRA VÀ TÍNH VOUCHER

      let discountAmount = new Prisma.Decimal(0);
      let promotionId: string | null = null;

      if (promotionCode) {
        const promotion = await tx.promotion.findUnique({
          where: {
            code: promotionCode,
          },
        });

        if (!promotion) {
          throw new HttpError(400, 'Ma giam gia khong ton tai');
        }

        const now = new Date();

        if (!promotion.isActive) {
          throw new HttpError(400, 'Ma giam gia khong con hoat dong');
        }

        if (now < promotion.startsAt || now > promotion.endsAt) {
          throw new HttpError(
            400,
            'Ma giam gia het han hoac chua den thoi gian su dung',
          );
        }

        if (
          promotion.usageLimit !== null &&
          promotion.usageCount >= promotion.usageLimit
        ) {
          throw new HttpError(400, 'Ma giam gia da het luot su dung');
        }

        if (subtotal.lessThan(promotion.minOrderAmount)) {
          throw new HttpError(400, 'Don hang chua dat gia tri toi thieu');
        }

        const discountValue = new Prisma.Decimal(
          promotion.discountValue,
        );

        if (promotion.discountType === DiscountType.PERCENTAGE) {
          if (
            discountValue.lessThan(0) ||
            discountValue.greaterThan(100)
          ) {
            throw new HttpError(400, 'Gia tri giam gia khong hop le');
          }

          discountAmount = subtotal.mul(discountValue).div(100);
        } else {
          if (discountValue.lessThan(0)) {
            throw new HttpError(400, 'Gia tri giam gia khong hop le');
          }

          discountAmount = discountValue;
        }

        if (promotion.maxDiscount !== null) {
          const maxDiscount = new Prisma.Decimal(
            promotion.maxDiscount,
          );

          if (discountAmount.greaterThan(maxDiscount)) {
            discountAmount = maxDiscount;
          }
        }

        if (discountAmount.greaterThan(subtotal)) {
          discountAmount = subtotal;
        }

        promotionId = promotion.id;
      }

      // 5. TÍNH TỔNG TIỀN

      const shippingFee = new Prisma.Decimal(0);

      const totalAmount = subtotal
        .sub(discountAmount)
        .add(shippingFee);

      if (totalAmount.lessThan(0)) {
        throw new HttpError(400, 'Tong tien don hang khong hop le');
      }

      // 6. TRỪ TỒN KHO

      const stockSnapshots: {
        variantId: string;
        quantity: number;
        stockBefore: number;
        stockAfter: number;
      }[] = [];

      for (const item of cartItems) {
        const stockBefore = item.variant.stock;

        if (stockBefore < item.quantity) {
          throw new HttpError(
            400,
            `San pham ${item.variant.product.name} khong du ton kho`,
          );
        }

        const result = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            isActive: true,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (result.count !== 1) {
          throw new HttpError(
            409,
            'Ton kho da thay doi. Vui long thu lai',
          );
        }

        stockSnapshots.push({
          variantId: item.variantId,
          quantity: item.quantity,
          stockBefore,
          stockAfter: stockBefore - item.quantity,
        });
      }

      // 7. TRẠNG THÁI THANH TOÁN BAN ĐẦU

      const paymentStatus =
        paymentMethod === PaymentMethod.COD
          ? PaymentStatus.UNPAID
          : PaymentStatus.PENDING;

      // 8. TẠO ĐƠN HÀNG

      // Payment được tạo riêng trong payment.service.ts.
      const order = await tx.order.create({
        data: {
          userId,
          addressId: addressId ?? null,

          recipientName,
          phone,
          shippingAddress,
          note: note || null,

          subtotalAmount: subtotal,
          discountAmount,
          shippingFee,
          totalAmount,

          status: OrderStatus.PENDING,
          paymentStatus,

          promotionId,

          items: {
            create: orderItems,
          },
        },

        include: {
          items: true,
          payments: true,
        },
      });

      // 9. GHI PHIẾU XUẤT KHO

      await tx.inventoryDocument.create({
        data: {
          code: taoMaPhieuKho(InventoryDocumentType.ORDER_OUT),
          type: InventoryDocumentType.ORDER_OUT,
          status: InventoryDocumentStatus.COMPLETED,

          reason: 'Xuat kho khi khach hang dat hang',
          note: `Don hang ${order.id}`,

          createdById: userId,
          confirmedById: userId,

          orderId: order.id,
          completedAt: new Date(),

          items: {
            create: stockSnapshots.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              stockBefore: item.stockBefore,
              stockAfter: item.stockAfter,
              note: `Xuat kho cho don hang ${order.id}`,
            })),
          },
        },
      });

      // 10. CẬP NHẬT LƯỢT SỬ DỤNG VOUCHER

      if (promotionId) {
        const currentPromotion = await tx.promotion.findUnique({
          where: {
            id: promotionId,
          },
          select: {
            usageLimit: true,
          },
        });

        if (!currentPromotion) {
          throw new HttpError(404, 'Voucher khong ton tai');
        }

        const updatedPromotion = await tx.promotion.updateMany({
          where: {
            id: promotionId,
            isActive: true,
            ...(currentPromotion.usageLimit !== null
              ? {
                  usageCount: {
                    lt: currentPromotion.usageLimit,
                  },
                }
              : {}),
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        });

        if (updatedPromotion.count !== 1) {
          throw new HttpError(409, 'Voucher da het luot su dung');
        }
      }

      // 11. XÓA GIỎ HÀNG

      await tx.cartItem.deleteMany({
        where: {
          userId,
        },
      });

      return order;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

// ==========================================
// 2. LẤY LỊCH SỬ ĐƠN HÀNG
// ==========================================

export async function getMyOrders(userId: string) {
  return prisma.order.findMany({
    where: {
      userId,
    },
    include: {
      items: true,
      payments: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// ==========================================
// 3. XEM CHI TIẾT ĐƠN HÀNG
// ==========================================

export async function getOrderDetail(
  userId: string,
  orderId: string,
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!order) {
    throw new HttpError(404, 'Khong tim thay don hang');
  }

  return order;
}

// ==========================================
// 4. ADMIN LẤY TẤT CẢ ĐƠN HÀNG
// ==========================================

export async function getAllOrders(status?: OrderStatus) {
  return prisma.order.findMany({
    where: status ? { status } : {},
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: true,
      payments: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// ==========================================
// 5. ADMIN CẬP NHẬT TRẠNG THÁI ĐƠN
// ==========================================

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
) {
  if (!Object.values(OrderStatus).includes(status)) {
    throw new HttpError(400, 'Trang thai don hang khong hop le');
  }

  const allowedTransitions: Partial<Record<OrderStatus, OrderStatus>> = {
    [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
    [OrderStatus.CONFIRMED]: OrderStatus.PROCESSING,
    [OrderStatus.PROCESSING]: OrderStatus.SHIPPED,
    [OrderStatus.SHIPPED]: OrderStatus.DELIVERED,
  };

  return prisma.$transaction(
    async (tx) => {
      // Khóa đơn hàng để tránh xung đột với thanh toán.
      await khoaDonHang(tx, orderId);

      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          payments: true,
        },
      });

      if (!order) {
        throw new HttpError(404, 'Khong tim thay don hang');
      }

      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.DELIVERED
      ) {
        throw new HttpError(
          400,
          'Don hang khong the tiep tuc cap nhat',
        );
      }

      const nextStatus = allowedTransitions[order.status];

      if (!nextStatus || status !== nextStatus) {
        throw new HttpError(
          400,
          'Khong the chuyen sang trang thai nay. Vui long cap nhat dung thu tu',
        );
      }

      // Xác định đơn COD dựa trên bản ghi thanh toán.
      const isCOD = order.payments.some(
        (payment) => payment.method === PaymentMethod.COD,
      );

      // Không xác nhận đơn VNPAY khi chưa thanh toán.
      if (status === OrderStatus.CONFIRMED) {
        const isPaymentValid =
          order.paymentStatus === PaymentStatus.PAID ||
          (isCOD && order.paymentStatus === PaymentStatus.UNPAID);

        if (!isPaymentValid) {
          throw new HttpError(
            400,
            'Don hang online phai thanh toan thanh cong truoc khi xac nhan',
          );
        }
      }

      // Chỉ cho phép xử lý đơn đã thanh toán hoặc COD.
      if (
        status === OrderStatus.PROCESSING ||
        status === OrderStatus.SHIPPED ||
        status === OrderStatus.DELIVERED
      ) {
        const isPaymentValid =
          order.paymentStatus === PaymentStatus.PAID ||
          (isCOD && order.paymentStatus === PaymentStatus.UNPAID);

        if (!isPaymentValid) {
          throw new HttpError(
            400,
            'Don hang chua thanh toan thanh cong',
          );
        }
      }

      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        data: {
          status,
        },
      });

      if (updated.count !== 1) {
        throw new HttpError(
          409,
          'Don hang da duoc cap nhat boi yeu cau khac',
        );
      }

      return tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
          payments: true,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

// ==========================================
// 6. HỦY ĐƠN HÀNG VÀ HOÀN TỒN KHO
// ==========================================

export async function cancelOrder(
  userId: string,
  orderId: string,
  isAdmin = false,
) {
  return prisma.$transaction(
    async (tx) => {
      // Khóa đơn hàng để đồng bộ với payment.service.ts.
      await khoaDonHang(tx, orderId);

      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          ...(isAdmin ? {} : { userId }),
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new HttpError(404, 'Khong tim thay don hang');
      }

      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        throw new HttpError(
          400,
          'Don hang khong the huy o trang thai hien tai',
        );
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new HttpError(
          400,
          'Don hang da thanh toan. Can xu ly hoan tien truoc khi huy',
        );
      }

      // Cập nhật trạng thái trước.
      // Nếu không cập nhật được thì transaction sẽ dừng.
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          ...(isAdmin ? {} : { userId }),
          status: order.status,
          paymentStatus: {
            not: PaymentStatus.PAID,
          },
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      if (updated.count !== 1) {
        throw new HttpError(
          409,
          'Don hang da duoc xu ly boi yeu cau khac',
        );
      }

      // HOÀN TỒN KHO

      const stockSnapshots: {
        variantId: string;
        quantity: number;
        stockBefore: number;
        stockAfter: number;
      }[] = [];

      for (const item of order.items) {
        if (!item.variantId) {
          continue;
        }

        const variant = await tx.productVariant.findUnique({
          where: {
            id: item.variantId,
          },
          select: {
            id: true,
            stock: true,
          },
        });

        if (!variant) {
          continue;
        }

        const stockBefore = variant.stock;
        const stockAfter = stockBefore + item.quantity;

        await tx.productVariant.update({
          where: {
            id: item.variantId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        stockSnapshots.push({
          variantId: item.variantId,
          quantity: item.quantity,
          stockBefore,
          stockAfter,
        });
      }

      // GHI PHIẾU HOÀN KHO

      if (stockSnapshots.length > 0) {
        await tx.inventoryDocument.create({
          data: {
            code: taoMaPhieuKho(InventoryDocumentType.ORDER_RETURN),
            type: InventoryDocumentType.ORDER_RETURN,
            status: InventoryDocumentStatus.COMPLETED,

            reason: 'Hoan kho khi huy don hang',
            note: `Hoan kho don hang ${order.id}`,

            createdById: userId,
            confirmedById: userId,

            orderId: order.id,
            completedAt: new Date(),

            items: {
              create: stockSnapshots.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                stockBefore: item.stockBefore,
                stockAfter: item.stockAfter,
                note: `Hoan kho don hang ${order.id}`,
              })),
            },
          },
        });
      }

      // ĐÓNG THANH TOÁN ĐANG CHỜ

      if (order.paymentStatus === PaymentStatus.PENDING) {
        await tx.payment.updateMany({
          where: {
            orderId,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: 'ORDER_CANCELLED',
          },
        });

        await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
      }

      return tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
          payments: true,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}