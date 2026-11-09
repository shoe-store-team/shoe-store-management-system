import {
  prisma,
} from '../../config/prisma';

import {
  HttpError,
} from '../common/http';

import {
  Prisma,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
} from '@prisma/client';

// ==========================================
// 1. TAO DON HANG
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
  },
) {
  const {
    recipientName,
    phone,
    shippingAddress,
    addressId,
    note,
    paymentMethod,
  } = data;

  if (!recipientName || !phone || !shippingAddress) {
    throw new HttpError(400, 'Thong tin giao hang khong day du');
  }

  if (!Object.values(PaymentMethod).includes(paymentMethod)) {
    throw new HttpError(400, 'Phuong thuc thanh toan khong hop le');
  }

  return prisma.$transaction(
    async (tx) => {

      // Lay gio hang
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

      // Kiem tra dia chi
      if (addressId) {
        const address = await tx.address.findFirst({
          where: {
            id: addressId,
            userId,
          },
        });

        if (!address) {
          throw new HttpError(404, 'Dia chi khong ton tai');
        }
      }

      let subtotal = new Prisma.Decimal(0);

      const orderItems = [];

      // Kiem tra san pham va tinh tien
      for (const item of cartItems) {
        const variant = item.variant;
        const product = variant.product;

        if (!variant.isActive || !product.isActive) {
          throw new HttpError(400, 'San pham khong con kinh doanh');
        }

        const price =
          variant.priceOverride ?? product.basePrice;

        subtotal = subtotal.add(
          price.mul(item.quantity),
        );

        orderItems.push({
          variantId: variant.id,
          productName: product.name,
          size: variant.size,
          color: variant.color,
          quantity: item.quantity,
          price,
        });
      }

      // Tru ton kho an toan
      for (const item of cartItems) {
        const result = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: {
              gte: item.quantity,
            },
            isActive: true,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (result.count !== 1) {
          throw new HttpError(
            400,
            'San pham khong du so luong ton kho',
          );
        }
      }

      const shippingFee = new Prisma.Decimal(0);
      const discountAmount = new Prisma.Decimal(0);

      const totalAmount = subtotal
        .add(shippingFee)
        .sub(discountAmount);

      const paymentStatus =
        paymentMethod === PaymentMethod.COD
          ? PaymentStatus.UNPAID
          : PaymentStatus.PENDING;

      // Tao don hang
      const order = await tx.order.create({
        data: {
          userId,
          addressId: addressId ?? null,
          recipientName,
          phone,
          shippingAddress,
          note,
          subtotalAmount: subtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          status: OrderStatus.PENDING,
          paymentStatus,

          items: {
            create: orderItems,
          },

          payments: {
            create: {
              method: paymentMethod,
              status: paymentStatus,
              amount: totalAmount,
            },
          },
        },

        include: {
          items: true,
          payments: true,
        },
      });

      // Xoa gio hang
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return order;
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

// ==========================================
// 2. LAY LICH SU DON HANG
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
// 3. XEM CHI TIET DON HANG
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
// 4. ADMIN LAY TAT CA DON HANG
// ==========================================

export async function getAllOrders(
  status?: OrderStatus,
) {
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
// 5. CAP NHAT TRANG THAI DON HANG
// ==========================================

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
) {
  const validStatuses = Object.values(OrderStatus);

  if (!validStatuses.includes(status)) {
    throw new HttpError(400, 'Trang thai khong hop le');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
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
        'Khong the thay doi trang thai don hang nay',
      );
    }

    if (status === OrderStatus.PENDING ||
        status === OrderStatus.CANCELLED) {
      throw new HttpError(
        400,
        'Trang thai nay khong duoc phep cap nhat truc tiep',
      );
    }

    if (
      order.paymentStatus === PaymentStatus.PENDING ||
      order.paymentStatus === PaymentStatus.FAILED
    ) {
      if (
        status === OrderStatus.PROCESSING ||
        status === OrderStatus.SHIPPED ||
        status === OrderStatus.DELIVERED
      ) {
        throw new HttpError(
          400,
          'Don hang chua thanh toan thanh cong',
        );
      }
    }

    return tx.order.update({
      where: {
        id: orderId,
      },

      data: {
        status,
      },

      include: {
        items: true,
        payments: true,
      },
    });
  });
}

// ==========================================
// 6. HUY DON HANG VA HOAN TON
// ==========================================

export async function cancelOrder(
  userId: string,
  orderId: string,
  isAdmin = false,
) {
  return prisma.$transaction(async (tx) => {

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
        'Don hang da thanh toan, can xu ly hoan tien truoc khi huy',
      );
    }

    // Cap nhat co dieu kien de tranh huy hai lan
    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        userId: isAdmin ? undefined : userId,
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

    // Hoan lai ton kho
    for (const item of order.items) {
      if (!item.variantId) continue;

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
    }

    // Cap nhat thanh toan dang cho
    await tx.payment.updateMany({
      where: {
        orderId,
        status: PaymentStatus.PENDING,
      },

      data: {
        status: PaymentStatus.FAILED,
        failureReason: 'Don hang da bi huy',
      },
    });

    return tx.order.findUnique({
      where: {
        id: orderId,
      },

      include: {
        items: true,
        payments: true,
      },
    });
  });
}