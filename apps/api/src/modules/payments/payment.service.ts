import {
  Prisma,
  type Order,
  type Payment,
} from '@prisma/client';

import { randomUUID } from 'node:crypto';

import { prisma } from '../../config/prisma';
import { PaymentError } from './payment.errors';
import * as vnpay from './vnpay';
import { cancelOrder } from '../orders/order.service';

type Tx = Prisma.TransactionClient;

type Outcome = {
  success: boolean;
  transactionNo?: string;
  paidAt?: Date | null;
  code: string;
};

type CancelInfo = {
  orderId: string;
  userId: string;
};

type InternalResult<T> = {
  data: T;
  cancel?: CancelInfo;
};

export type CreatePaymentInput = {
  orderId: string;
  method: 'COD' | 'VNPAY';
  bankCode?: 'VNPAYQR' | 'VNBANK' | 'INTCARD';
  simulateResult?: 'SUCCESS' | 'FAILED';
};

const GRACE_MS = 5 * 60_000;
const MIN_LINK_MS = 3 * 60_000;

const CLOSED_BY_SYSTEM = [
  'EXPIRED',
  'SWITCHED',
  'ORDER_CANCELLED',
];

const holdMinutes = () =>
  Number(process.env.ORDER_HOLD_MINUTES) || 30;

/* =========================================================
   CẤU HÌNH THANH TOÁN
========================================================= */

export function getConfig() {
  const provider = process.env.PAYMENT_PROVIDER ?? 'vnpay';

  if (provider !== 'vnpay' && provider !== 'mock') {
    throw new PaymentError(
      503,
      'PAYMENT_PROVIDER không hợp lệ (vnpay | mock).',
    );
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (
    provider === 'mock' &&
    isProd &&
    process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION !== 'true'
  ) {
    throw new PaymentError(
      503,
      'Production cần PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true để dùng mock.',
    );
  }

  return {
    provider,
    configured: provider === 'mock' || vnpay.isConfigured(),
    methods: ['COD', 'VNPAY'],
    channels: ['VNPAYQR', 'VNBANK', 'INTCARD'],
    holdMinutes: holdMinutes(),
    allowSimulate:
      provider === 'mock' &&
      process.env.PAYMENT_MOCK_ALLOW_OVERRIDE === 'true',
  };
}

/* =========================================================
   HÀM HỖ TRỢ
========================================================= */

const lockOrder = (tx: Tx, orderId: string) =>
  tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${orderId}::text))
  `;

const orderCodeOf = (orderId: string) =>
  `DH-${orderId.slice(0, 8).toUpperCase()}`;

function expiryOf(payment: Payment): Date | null {
  try {
    if (!payment.paymentUrl) return null;

    const raw = new URL(payment.paymentUrl).searchParams.get(
      'vnp_ExpireDate',
    );

    return vnpay.parsePayDate(raw ?? undefined);
  } catch {
    return null;
  }
}

function isExpired(payment: Payment) {
  const exp = expiryOf(payment);

  return !exp || exp.getTime() + GRACE_MS < Date.now();
}

const isClosedBySystem = (payment: Payment) =>
  payment.status === 'FAILED' &&
  CLOSED_BY_SYSTEM.includes(payment.failureReason ?? '');

const sameAmount = (
  vnpAmount: string | undefined,
  amount: Prisma.Decimal,
) => {
  return (
    /^\d+$/.test(vnpAmount ?? '') &&
    BigInt(vnpAmount!) === BigInt(amount.toFixed(0)) * 100n
  );
};

const validTxn = (
  transactionNo: string | undefined,
  date: Date | null,
) => {
  return (
    Boolean(date) &&
    /^[0-9]{1,15}$/.test(transactionNo ?? '') &&
    transactionNo !== '0'
  );
};

// Hủy đơn sau khi transaction thanh toán đã hoàn tất.
// cancelOrder sẽ tự hoàn kho và ghi phiếu ORDER_RETURN.
async function cancelAfterPaymentFailure(
  info?: CancelInfo,
) {
  if (!info) return;

  try {
    await cancelOrder(info.userId, info.orderId, true);
  } catch (error) {
    console.warn(
      `[payments] Không thể tự động hủy đơn ${info.orderId}:`,
      error,
    );
  }
}

/* =========================================================
   CHUYỂN DỮ LIỆU TRẢ VỀ FRONTEND
========================================================= */

export function toResponse(
  payment: Payment,
  order: Pick<Order, 'status' | 'paymentStatus'>,
) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderCode: orderCodeOf(payment.orderId),

    method: payment.method,

    status: payment.status,
    orderStatus: order.status,
    orderPaymentStatus: order.paymentStatus,

    amount: Number(payment.amount),

    transactionId: payment.providerTransactionId,

    paidAt: payment.paidAt?.toISOString() ?? null,

    reference: vnpay.toTxnRef(payment.id),

    paymentUrl:
      payment.status === 'PENDING'
        ? payment.paymentUrl
        : null,

    expiresAt: expiryOf(payment)?.toISOString() ?? null,
  };
}

/* =========================================================
   GHI NHẬN KẾT QUẢ THANH TOÁN
========================================================= */

async function finalize(
  tx: Tx,
  payment: Payment,
  order: Order,
  result: Outcome,
) {
  // -----------------------------------------
  // THANH TOÁN THẤT BẠI
  // -----------------------------------------

  if (!result.success) {
    const updatedPayment = await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'FAILED',
        failureReason: `VNPAY_${result.code}`,
      },
    });

    const updatedOrder =
      order.paymentStatus === 'PAID'
        ? order
        : await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              paymentStatus: 'FAILED',
            },
          });

    return {
      payment: updatedPayment,
      order: updatedOrder,
      shouldCancel:
        order.paymentStatus !== 'PAID' &&
        order.status !== 'CANCELLED',
    };
  }

  // -----------------------------------------
  // THANH TOÁN THÀNH CÔNG
  // -----------------------------------------

  if (
    order.paymentStatus === 'PAID' ||
    order.status === 'CANCELLED'
  ) {
    console.warn(
      `[payments] Đơn ${order.id} (${order.status}/${order.paymentStatus}) vừa nhận thêm tiền từ payment ${payment.id}. Cần kiểm tra hoàn tiền.`,
    );
  }

  const updatedPayment = await tx.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: 'PAID',
      providerTransactionId: result.transactionNo,
      paidAt: result.paidAt ?? new Date(),
      failureReason: null,
    },
  });

  // Nếu tiền về muộn sau khi đơn đã hủy:
  // - Giữ nguyên trạng thái đơn CANCELLED.
  // - Ghi nhận paymentStatus PAID.
  // - Cần xử lý hoàn tiền thủ công.
  const updatedOrder = await tx.order.update({
    where: {
      id: order.id,
    },
    data: {
      paymentStatus: 'PAID',
      status:
        order.status === 'CANCELLED'
          ? 'CANCELLED'
          : order.status === 'PENDING'
            ? 'CONFIRMED'
            : order.status,
    },
  });

  return {
    payment: updatedPayment,
    order: updatedOrder,
    shouldCancel: false,
  };
}

/* =========================================================
   TẠO THANH TOÁN
========================================================= */

export async function createPayment(
  userId: string,
  input: CreatePaymentInput,
  ip: string,
) {
  const {
    provider,
    configured,
    allowSimulate,
  } = getConfig();

  if (input.method === 'VNPAY' && !configured) {
    throw new PaymentError(
      503,
      'Thanh toán trực tuyến chưa được cấu hình (VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL).',
    );
  }

  if (input.simulateResult && !allowSimulate) {
    throw new PaymentError(
      400,
      'Chỉ chọn được kết quả khi bật chế độ giả lập (mock).',
    );
  }

  const result = await prisma.$transaction(
    async (tx): Promise<InternalResult<ReturnType<typeof toResponse>>> => {
      await lockOrder(tx, input.orderId);

      const order = await tx.order.findFirst({
        where: {
          id: input.orderId,
          userId,
        },
      });

      if (!order) {
        throw new PaymentError(404, 'Không tìm thấy đơn hàng.');
      }

      if (order.status === 'CANCELLED') {
        throw new PaymentError(
          409,
          'Đơn hàng đã bị hủy, không thể thanh toán.',
        );
      }

      if (order.paymentStatus === 'PAID') {
        throw new PaymentError(
          409,
          'Đơn hàng đã được thanh toán.',
        );
      }

      if (order.paymentStatus === 'FAILED') {
        throw new PaymentError(
          409,
          'Thanh toán đã thất bại hoặc hết hạn. Vui lòng đặt đơn hàng mới.',
        );
      }

      if (
        order.status !== 'PENDING' &&
        order.status !== 'CONFIRMED'
      ) {
        throw new PaymentError(
          409,
          'Đơn hàng không còn ở trạng thái có thể thanh toán.',
        );
      }

      const existingPayment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          status: {
            in: ['PENDING', 'UNPAID'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // -----------------------------------------
      // ĐƠN COD
      // -----------------------------------------

      if (existingPayment?.method === 'COD') {
        if (input.method === 'COD') {
          return {
            data: toResponse(existingPayment, order),
          };
        }

        throw new PaymentError(
          409,
          'Đơn hàng đã chọn thanh toán khi nhận hàng.',
        );
      }

      // -----------------------------------------
      // GIAO DỊCH VNPAY CŨ
      // -----------------------------------------

      if (existingPayment) {
        if (
          input.method === 'VNPAY' &&
          !isExpired(existingPayment)
        ) {
          return {
            data: toResponse(existingPayment, order),
          };
        }

        if (
          input.method === 'VNPAY' &&
          isExpired(existingPayment)
        ) {
          await tx.payment.update({
            where: {
              id: existingPayment.id,
            },
            data: {
              status: 'FAILED',
              failureReason: 'EXPIRED',
            },
          });

          await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              paymentStatus: 'FAILED',
            },
          });

          return {
            data: toResponse(
              {
                ...existingPayment,
                status: 'FAILED',
                failureReason: 'EXPIRED',
              },
              {
                ...order,
                paymentStatus: 'FAILED',
              },
            ),
            cancel: {
              orderId: order.id,
              userId: order.userId,
            },
          };
        }

        // Đổi từ VNPAY sang COD: đóng giao dịch cũ.
        await tx.payment.update({
          where: {
            id: existingPayment.id,
          },
          data: {
            status: 'FAILED',
            failureReason: 'SWITCHED',
          },
        });
      }

      // -----------------------------------------
      // KIỂM TRA SỐ TIỀN
      // -----------------------------------------

      const amount = Number(order.totalAmount);

      if (
        !Number.isSafeInteger(amount) ||
        amount < 0 ||
        amount > 9_999_999_999
      ) {
        throw new PaymentError(
          400,
          'Số tiền thanh toán không hợp lệ (VND phải là số nguyên).',
        );
      }

      const id = randomUUID();
      const now = new Date();

      // -----------------------------------------
      // THANH TOÁN COD
      // -----------------------------------------

      if (input.method === 'COD') {
        const payment = await tx.payment.create({
          data: {
            id,
            orderId: order.id,
            method: 'COD',
            status: 'UNPAID',
            amount: order.totalAmount,
          },
        });

        const updatedOrder = await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'UNPAID',
          },
        });

        return {
          data: toResponse(payment, updatedOrder),
        };
      }

      // -----------------------------------------
      // THANH TOÁN VNPAY
      // -----------------------------------------

      const free = amount === 0;
      const instant = free || provider === 'mock';

      const expires = new Date(
        order.createdAt.getTime() +
          holdMinutes() * 60_000,
      );

      if (
        !instant &&
        expires.getTime() - now.getTime() < MIN_LINK_MS
      ) {
        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            paymentStatus: 'FAILED',
          },
        });

        return {
          data: toResponse(
            {
              id,
              orderId: order.id,
              method: 'VNPAY',
              status: 'FAILED',
              amount: order.totalAmount,
              paymentUrl: null,
              providerTransactionId: null,
              paidAt: null,
              failureReason: 'EXPIRED',
              createdAt: now,
              updatedAt: now,
            } as Payment,
            {
              ...order,
              paymentStatus: 'FAILED',
            },
          ),
          cancel: {
            orderId: order.id,
            userId: order.userId,
          },
        };
      }

      const paymentUrl = instant
        ? null
        : vnpay.createUrl({
            amount,
            txnRef: vnpay.toTxnRef(id),
            orderInfo: `Thanh toan don hang ${orderCodeOf(order.id)}`,
            now,
            expires,
            ip,
            bankCode: input.bankCode,
          });

      const payment = await tx.payment.create({
        data: {
          id,
          orderId: order.id,
          method: 'VNPAY',
          status: 'PENDING',
          amount: order.totalAmount,
          paymentUrl,
        },
      });

      // -----------------------------------------
      // MOCK HOẶC ĐƠN HÀNG 0 ĐỒNG
      // -----------------------------------------

      if (instant) {
        const success =
          free || input.simulateResult !== 'FAILED';

        const done = await finalize(
          tx,
          payment,
          order,
          {
            success,
            transactionNo: `${free ? 'FREE' : 'MOCK'}-${randomUUID()}`,
            paidAt: now,
            code: success ? '00' : '24',
          },
        );

        return {
          data: toResponse(done.payment, done.order),
          ...(done.shouldCancel
            ? {
                cancel: {
                  orderId: order.id,
                  userId: order.userId,
                },
              }
            : {}),
        };
      }

      const updatedOrder = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          paymentStatus: 'PENDING',
        },
      });

      return {
        data: toResponse(payment, updatedOrder),
      };
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  await cancelAfterPaymentFailure(result.cancel);

  if (result.cancel) {
    throw new PaymentError(
      409,
      'Thanh toán thất bại hoặc đã hết hạn. Đơn hàng đã được hủy và hoàn tồn kho. Vui lòng đặt đơn mới.',
    );
  }

  return result.data;
}

/* =========================================================
   IPN: VNPAY GỬI KẾT QUẢ VỀ SERVER
========================================================= */

export async function ipn(
  query: Record<string, unknown>,
) {
  try {
    const params = vnpay.extractParams(query);

    if (!params || !vnpay.verify(params)) {
      return {
        RspCode: '97',
        Message: 'Invalid signature',
      };
    }

    const paymentId = vnpay.fromTxnRef(
      params.vnp_TxnRef ?? '',
    );

    const found = paymentId
      ? await prisma.payment.findUnique({
          where: {
            id: paymentId,
          },
        })
      : null;

    if (!found || found.method !== 'VNPAY') {
      return {
        RspCode: '01',
        Message: 'Order not found',
      };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await lockOrder(tx, found.orderId);

        const payment = await tx.payment.findUniqueOrThrow({
          where: {
            id: found.id,
          },
        });

        const order = await tx.order.findUniqueOrThrow({
          where: {
            id: payment.orderId,
          },
        });

        if (
          !sameAmount(params.vnp_Amount, payment.amount) ||
          !payment.amount.equals(order.totalAmount)
        ) {
          return {
            response: {
              RspCode: '04',
              Message: 'Invalid amount',
            },
          };
        }

        const reopen = isClosedBySystem(payment);

        if (
          payment.status !== 'PENDING' &&
          !reopen
        ) {
          return {
            response: {
              RspCode: '02',
              Message: 'Order already confirmed',
            },
          };
        }

        const rc = params.vnp_ResponseCode;
        const ts = params.vnp_TransactionStatus;

        if (
          !/^\d{2}$/.test(rc ?? '') ||
          !/^\d{2}$/.test(ts ?? '')
        ) {
          return {
            response: {
              RspCode: '99',
              Message: 'Invalid result',
            },
          };
        }

        if (
          ['01', '04', '05', '06', '07', '09'].includes(ts) ||
          rc === '07'
        ) {
          return {
            response: {
              RspCode: '99',
              Message: 'Pending reconciliation',
            },
          };
        }

        const success = rc === '00' && ts === '00';

        if (!success && reopen) {
          return {
            response: {
              RspCode: '00',
              Message: 'Confirm success',
            },
          };
        }

        const date = vnpay.parsePayDate(
          params.vnp_PayDate,
        );

        if (
          success &&
          !validTxn(params.vnp_TransactionNo, date)
        ) {
          return {
            response: {
              RspCode: '99',
              Message: 'Invalid transaction',
            },
          };
        }

        const done = await finalize(
          tx,
          payment,
          order,
          {
            success,
            transactionNo: params.vnp_TransactionNo,
            paidAt: date,
            code: rc,
          },
        );

        return {
          response: {
            RspCode: '00',
            Message: 'Confirm success',
          },
          cancel: done.shouldCancel
            ? {
                orderId: order.id,
                userId: order.userId,
              }
            : undefined,
        };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    await cancelAfterPaymentFailure(result.cancel);

    return result.response;
  } catch (error) {
    console.error(
      '[payments] VNPay IPN lỗi, VNPay sẽ gọi lại:',
      error,
    );

    return {
      RspCode: '99',
      Message: 'Temporary error',
    };
  }
}

/* =========================================================
   TRA CỨU GIAO DỊCH THEO MÃ THAM CHIẾU
========================================================= */

export async function byReference(
  userId: string,
  ref: string,
) {
  const id = vnpay.fromTxnRef(ref);

  const payment = id
    ? await prisma.payment.findFirst({
        where: {
          id,
          order: {
            userId,
          },
        },
        include: {
          order: true,
        },
      })
    : null;

  if (!payment) {
    throw new PaymentError(
      404,
      'Không tìm thấy giao dịch.',
    );
  }

  if (
    payment.method === 'VNPAY' &&
    payment.status === 'PENDING' &&
    isExpired(payment)
  ) {
    await prisma.$transaction(
      async (tx) => {
        await lockOrder(tx, payment.orderId);

        const current = await tx.payment.findUniqueOrThrow({
          where: {
            id: payment.id,
          },
        });

        if (current.status !== 'PENDING') return;

        await tx.payment.update({
          where: {
            id: current.id,
          },
          data: {
            status: 'FAILED',
            failureReason: 'EXPIRED',
          },
        });

        await tx.order.updateMany({
          where: {
            id: payment.orderId,
            paymentStatus: 'PENDING',
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
          data: {
            paymentStatus: 'FAILED',
          },
        });
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    await cancelAfterPaymentFailure({
      orderId: payment.orderId,
      userId,
    });

    const updated = await prisma.payment.findUniqueOrThrow({
      where: {
        id: payment.id,
      },
      include: {
        order: true,
      },
    });

    return toResponse(updated, updated.order);
  }

  return toResponse(payment, payment.order);
}

/* =========================================================
   ĐỐI SOÁT GIAO DỊCH VỚI VNPAY
========================================================= */

export async function reconcile(
  userId: string,
  id: string,
) {
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      order: {
        userId,
      },
    },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new PaymentError(
      404,
      'Không tìm thấy giao dịch.',
    );
  }

  if (
    payment.method !== 'VNPAY' ||
    !payment.paymentUrl
  ) {
    return toResponse(payment, payment.order);
  }

  if (
    payment.status === 'PENDING' &&
    isExpired(payment)
  ) {
    await prisma.$transaction(
      async (tx) => {
        await lockOrder(tx, payment.orderId);

        const current = await tx.payment.findUniqueOrThrow({
          where: {
            id,
          },
        });

        if (current.status !== 'PENDING') return;

        await tx.payment.update({
          where: {
            id,
          },
          data: {
            status: 'FAILED',
            failureReason: 'EXPIRED',
          },
        });

        await tx.order.updateMany({
          where: {
            id: payment.orderId,
            paymentStatus: 'PENDING',
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
          data: {
            paymentStatus: 'FAILED',
          },
        });
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    await cancelAfterPaymentFailure({
      orderId: payment.orderId,
      userId,
    });

    const updated = await prisma.payment.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        order: true,
      },
    });

    return toResponse(updated, updated.order);
  }

  if (
    payment.status !== 'PENDING' &&
    !isClosedBySystem(payment)
  ) {
    return toResponse(payment, payment.order);
  }

  const createDate = new URL(
    payment.paymentUrl,
  ).searchParams.get('vnp_CreateDate');

  if (!createDate) {
    throw new PaymentError(
      409,
      'Giao dịch thiếu thời gian khởi tạo.',
    );
  }

  const result = await vnpay.queryTransaction(
    vnpay.toTxnRef(payment.id),
    createDate,
  );

  if (
    result.vnp_ResponseCode !== '00' ||
    result.vnp_TransactionType !== '01' ||
    !['00', '02'].includes(
      result.vnp_TransactionStatus,
    )
  ) {
    return {
      ...toResponse(payment, payment.order),
      message:
        'VNPay chưa xác nhận kết quả cuối cùng. Thử lại sau.',
    };
  }

  if (
    !sameAmount(
      result.vnp_Amount,
      payment.amount,
    )
  ) {
    throw new PaymentError(
      409,
      'Số tiền đối soát không khớp.',
    );
  }

  const done = await prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, payment.orderId);

      const current = await tx.payment.findUniqueOrThrow({
        where: {
          id,
        },
      });

      const order = await tx.order.findUniqueOrThrow({
        where: {
          id: payment.orderId,
        },
      });

      if (
        current.status !== 'PENDING' &&
        !isClosedBySystem(current)
      ) {
        return {
          data: toResponse(current, order),
        };
      }

      const success =
        result.vnp_TransactionStatus === '00';

      const paidAt = vnpay.parsePayDate(
        result.vnp_PayDate,
      );

      if (
        success &&
        !validTxn(result.vnp_TransactionNo, paidAt)
      ) {
        throw new PaymentError(
          409,
          'Kết quả đối soát thiếu mã/thời gian giao dịch.',
        );
      }

      if (
        !success &&
        isClosedBySystem(current)
      ) {
        return {
          data: toResponse(current, order),
        };
      }

      const finalized = await finalize(
        tx,
        current,
        order,
        {
          success,
          transactionNo: result.vnp_TransactionNo,
          paidAt,
          code: success ? '00' : '99',
        },
      );

      return {
        data: toResponse(
          finalized.payment,
          finalized.order,
        ),
        cancel: finalized.shouldCancel
          ? {
              orderId: order.id,
              userId: order.userId,
            }
          : undefined,
      };
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  await cancelAfterPaymentFailure(done.cancel);

  if (done.cancel) {
    const updated = await prisma.payment.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        order: true,
      },
    });

    return toResponse(updated, updated.order);
  }

  return done.data;
}

/* =========================================================
   TỰ ĐỘNG HỦY ĐƠN VNPAY HẾT HẠN
========================================================= */

export async function expirePendingPayments() {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      method: 'VNPAY',
      status: 'PENDING',
    },
    include: {
      order: {
        select: {
          id: true,
          userId: true,
          status: true,
          paymentStatus: true,
        },
      },
    },
  });

  let expiredCount = 0;

  for (const payment of pendingPayments) {
    if (!isExpired(payment)) continue;

    try {
      const expired = await prisma.$transaction(
        async (tx) => {
          await lockOrder(tx, payment.orderId);

          const current = await tx.payment.findUnique({
            where: {
              id: payment.id,
            },
          });

          if (!current || current.status !== 'PENDING') {
            return false;
          }

          const order = await tx.order.findUnique({
            where: {
              id: payment.orderId,
            },
          });

          if (
            !order ||
            order.status === 'CANCELLED' ||
            order.paymentStatus === 'PAID' ||
            !['PENDING', 'CONFIRMED'].includes(order.status)
          ) {
            return false;
          }

          await tx.payment.update({
            where: {
              id: current.id,
            },
            data: {
              status: 'FAILED',
              failureReason: 'EXPIRED',
            },
          });

          await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              paymentStatus: 'FAILED',
            },
          });

          return true;
        },
        {
          maxWait: 10_000,
          timeout: 20_000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      if (expired) {
        await cancelAfterPaymentFailure({
          orderId: payment.orderId,
          userId: payment.order.userId,
        });

        expiredCount++;
      }
    } catch (error) {
      console.error(
        `[payments] Lỗi xử lý đơn hết hạn ${payment.orderId}:`,
        error,
      );
    }
  }

  if (expiredCount > 0) {
    console.log(
      `[payments] Đã tự động hủy ${expiredCount} đơn VNPAY hết hạn.`,
    );
  }

  return expiredCount;
}