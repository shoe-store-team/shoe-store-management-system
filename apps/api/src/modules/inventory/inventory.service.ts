import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  InventoryDocumentStatus,
  InventoryDocumentType,
  PrismaClient,
} from "@prisma/client";
type InventoryItemInput = {
  variantId?: string;
  productVariantId?: string;
  countedStock?: number;
  quantity?: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}
  private normalizeVariantId(item: InventoryItemInput) {
    return item.variantId ?? item.productVariantId;
  }
  private buildDocumentCode(type: InventoryDocumentType) {
    const stamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${type}-${stamp}-${suffix}`;
  }
  private getCountDocumentId(note: string | null) {
    return note?.match(/\[\[inventory-count:([^\]]+)\]\]/)?.[1] ?? null;
  }
  async createInventoryDocument(data: {
    warehouseId?: string;
    createdById: string;
    type?: InventoryDocumentType;
    reason?: string;
    note?: string;
    variantIds?: string[];
  }) {
    const type = data.type ?? InventoryDocumentType.COUNT;
    const variants = data.variantIds?.length
      ? await this.prisma.productVariant.findMany({
          where: {
            id: { in: data.variantIds },
            isActive: true,
          },
        })
      : await this.prisma.productVariant.findMany({
          where: { isActive: true },
        });
    if (!variants.length) {
      throw new BadRequestException(
        "Không tìm thấy sản phẩm nào để tạo phiếu kho!",
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const inventoryDoc = await tx.inventoryDocument.create({
        data: {
          code: this.buildDocumentCode(type),
          type,
          status: InventoryDocumentStatus.DRAFT,
          createdById: data.createdById,
          reason: data.reason ?? `Tạo phiếu ${type}`,
          note: data.note ?? null,
          items: {
            create: variants.map((variant) => ({
              variantId: variant.id,
              quantity: 0,
              countedStock:
                type === InventoryDocumentType.COUNT ? variant.stock : null,
              stockBefore: variant.stock,
              stockAfter: variant.stock,
            })),
          },
        },
        include: { items: { include: { variant: true } } },
      });
      return inventoryDoc;
    });
  }
  async updateCountedStock(
    documentId: string,
    items: { variantId?: string; productVariantId?: string; countedStock: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.inventoryDocument.findUnique({
        where: { id: documentId },
      });
      if (!doc) {
        throw new NotFoundException("Không tìm thấy phiếu kiểm kê!");
      }
      if (
        doc.status === InventoryDocumentStatus.COMPLETED ||
        doc.status === InventoryDocumentStatus.CANCELLED
      ) {
        throw new BadRequestException(
          "Phiếu kiểm kê đã kết thúc, không thể cập nhật thêm!",
        );
      }
      const pendingAdjustment = await tx.inventoryDocument.findFirst({
        where: {
          type: InventoryDocumentType.ADJUSTMENT,
          status: InventoryDocumentStatus.DRAFT,
          note: { contains: `[[inventory-count:${documentId}]]` },
        },
        select: { id: true },
      });
      if (pendingAdjustment) {
        throw new BadRequestException(
          "Phiếu kiểm kê đã tạo phiếu điều chỉnh, không thể sửa số đếm!",
        );
      }
      const editable = await tx.inventoryDocument.updateMany({
        where: {
          id: documentId,
          type: InventoryDocumentType.COUNT,
          status: InventoryDocumentStatus.DRAFT,
        },
        data: { updatedAt: new Date() },
      });
      if (editable.count !== 1) {
        throw new BadRequestException(
          "Phiếu kiểm kê đã được xử lý, không thể cập nhật số đếm!",
        );
      }
      for (const item of items) {
        const variantId = this.normalizeVariantId(item);
        if (!variantId) {
          throw new BadRequestException("Thiếu variantId trong dữ liệu kiểm kê!");
        }
        await tx.inventoryDocumentItem.update({
          where: {
            documentId_variantId: {
              documentId,
              variantId,
            },
          },
          data: { countedStock: item.countedStock },
        });
      }
      return {
        success: true,
        message: "Đã cập nhật số đếm thực tế thành công.",
      };
    }, { isolationLevel: "Serializable" });
  }
  async confirmDocument(documentId: string, confirmedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.inventoryDocument.findUnique({
        where: { id: documentId },
        include: { items: { include: { variant: true } } },
      });
      if (!document) {
        throw new NotFoundException("Không tìm thấy phiếu kho!");
      }
      if (
        document.status === InventoryDocumentStatus.COMPLETED ||
        document.status === InventoryDocumentStatus.CANCELLED
      ) {
        throw new BadRequestException("Phiếu này đã được xác nhận trước đó!");
      }
      if (!document.items.length) {
        throw new BadRequestException("Phiếu kho không có sản phẩm!");
      }
      if (document.type === InventoryDocumentType.COUNT) {
        throw new BadRequestException(
          "Phiếu kiểm kê phải được xử lý bằng quy trình đối chiếu kiểm kê!",
        );
      }

      for (const item of document.items) {
        const quantity = item.quantity;
        const stockBefore = item.variant.stock;
        let stockAfter: number;
        if (
          document.type === InventoryDocumentType.IMPORT ||
          document.type === InventoryDocumentType.ORDER_RETURN
        ) {
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new BadRequestException("Số lượng nhập phải là số nguyên lớn hơn 0!");
          }
          const updated = await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: quantity } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException("Không thể cập nhật tồn kho biến thể!");
          }
          stockAfter = stockBefore + quantity;
        } else if (
          document.type === InventoryDocumentType.EXPORT ||
          document.type === InventoryDocumentType.ORDER_OUT
        ) {
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new BadRequestException("Số lượng xuất phải là số nguyên lớn hơn 0!");
          }
          const updated = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stock: { gte: quantity },
            },
            data: { stock: { decrement: quantity } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException(
              `Sản phẩm biến thể ${item.variantId} không đủ tồn kho để xuất!`,
            );
          }
          stockAfter = stockBefore - quantity;
        } else if (document.type === InventoryDocumentType.ADJUSTMENT) {
          if (!Number.isInteger(quantity) || quantity < 0) {
            throw new BadRequestException(
              "Tồn kho điều chỉnh phải là số nguyên không âm!",
            );
          }
          stockAfter = quantity;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: stockAfter },
          });
        } else {
          throw new BadRequestException(
            "Phiếu kiểm kê phải được xử lý bằng quy trình đối chiếu kiểm kê!",
          );
        }

        await tx.inventoryDocumentItem.update({
          where: {
            documentId_variantId: { documentId, variantId: item.variantId },
          },
          data: { stockBefore, stockAfter },
        });
      }

      const completed = await tx.inventoryDocument.updateMany({
        where: {
          id: documentId,
          status: InventoryDocumentStatus.DRAFT,
        },
        data: {
          status: InventoryDocumentStatus.COMPLETED,
          confirmedById,
          completedAt: new Date(),
        },
      });
      if (completed.count !== 1) {
        throw new BadRequestException("Phiếu kho đã được xác nhận trước đó!");
      }

      const countDocumentId = this.getCountDocumentId(document.note);
      if (countDocumentId) {
        const countCompleted = await tx.inventoryDocument.updateMany({
          where: {
            id: countDocumentId,
            type: InventoryDocumentType.COUNT,
            status: InventoryDocumentStatus.DRAFT,
          },
          data: {
            status: InventoryDocumentStatus.COMPLETED,
            confirmedById,
            completedAt: new Date(),
          },
        });
        if (countCompleted.count !== 1) {
          throw new BadRequestException(
            "Phiếu kiểm kê liên quan không còn ở trạng thái chờ xác nhận!",
          );
        }
      }

      const updatedDoc = await tx.inventoryDocument.findUnique({
        where: { id: documentId },
      });
      return {
        success: true,
        message: "Đã xác nhận phiếu kho thành công.",
        data: updatedDoc,
      };
    }, { isolationLevel: "Serializable" });
  }
  async processAuditDocument(documentId: string, confirmedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.inventoryDocument.findUnique({
        where: { id: documentId },
        include: { items: { include: { variant: true } } },
      });
      if (!document) {
        throw new NotFoundException("Không tìm thấy phiếu kiểm kê!");
      }
      if (
        document.status === InventoryDocumentStatus.COMPLETED ||
        document.status === InventoryDocumentStatus.CANCELLED
      ) {
        throw new BadRequestException("Phiếu này đã được xử lý trước đó!");
      }
      if (document.type !== InventoryDocumentType.COUNT) {
        throw new BadRequestException("Đây không phải là phiếu kiểm kê!");
      }
      if (!document.items.length) {
        throw new BadRequestException("Phiếu kiểm kê không có sản phẩm!");
      }

      const existingAdjustment = await tx.inventoryDocument.findFirst({
        where: {
          type: InventoryDocumentType.ADJUSTMENT,
          note: { contains: `[[inventory-count:${documentId}]]` },
        },
        include: { items: true },
      });
      if (existingAdjustment) {
        if (existingAdjustment.status !== InventoryDocumentStatus.DRAFT) {
          throw new BadRequestException(
            "Phiếu kiểm kê liên quan đã được xử lý trước đó!",
          );
        }
        return {
          success: true,
          type: "ADJUSTMENT_REQUIRED",
          message: "Phiếu điều chỉnh đã được tạo và đang chờ xác nhận.",
          discrepancies: existingAdjustment.items.map((item) => ({
            variantId: item.variantId,
            currentStock: item.stockBefore ?? 0,
            countedStock: item.quantity,
            difference: item.quantity - (item.stockBefore ?? 0),
          })),
          adjustmentDocument: {
            id: existingAdjustment.id,
            code: existingAdjustment.code,
          },
        };
      }

      const claimed = await tx.inventoryDocument.updateMany({
        where: {
          id: documentId,
          type: InventoryDocumentType.COUNT,
          status: InventoryDocumentStatus.DRAFT,
        },
        data: {
          status: InventoryDocumentStatus.COMPLETED,
          confirmedById,
          completedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Phiếu kiểm kê đã được xử lý trước đó!");
      }

      const discrepancyDetails: {
        variantId: string;
        currentStock: number;
        countedStock: number;
        difference: number;
      }[] = [];
      for (const item of document.items) {
        const currentStock = item.variant.stock;
        const countedStock = item.countedStock;
        if (
          countedStock === null ||
          !Number.isInteger(countedStock) ||
          countedStock < 0
        ) {
          throw new BadRequestException(
            "Tất cả số lượng kiểm kê phải là số nguyên không âm!",
          );
        }
        const diff = countedStock - currentStock;
        if (diff !== 0) {
          discrepancyDetails.push({
            variantId: item.variantId,
            currentStock,
            countedStock,
            difference: diff,
          });
        }
      }

      if (!discrepancyDetails.length) {
        for (const item of document.items) {
          await tx.inventoryDocumentItem.update({
            where: {
              documentId_variantId: {
                documentId,
                variantId: item.variantId,
              },
            },
            data: {
              stockBefore: item.variant.stock,
              stockAfter: item.variant.stock,
            },
          });
        }
        const completed = await tx.inventoryDocument.updateMany({
          where: { id: documentId },
          data: {
            status: InventoryDocumentStatus.COMPLETED,
            confirmedById,
            completedAt: new Date(),
          },
        });
        if (completed.count !== 1) {
          throw new BadRequestException("Phiếu kiểm kê đã được xử lý trước đó!");
        }
        const updatedDoc = await tx.inventoryDocument.findUnique({
          where: { id: documentId },
        });
        return {
          success: true,
          type: "MATCHED",
          message: "Kiểm kê khớp hoàn toàn. Đã lưu biên bản và hoàn tất.",
          data: updatedDoc,
        };
      }

      const adjustment = await tx.inventoryDocument.create({
        data: {
          code: this.buildDocumentCode(InventoryDocumentType.ADJUSTMENT),
          type: InventoryDocumentType.ADJUSTMENT,
          status: InventoryDocumentStatus.DRAFT,
          createdById: document.createdById,
          reason: `Điều chỉnh theo kiểm kê ${document.code}`,
          note: `[[inventory-count:${documentId}]]`,
          items: {
            create: discrepancyDetails.map((discrepancy) => ({
              variantId: discrepancy.variantId,
              quantity: discrepancy.countedStock,
              stockBefore: discrepancy.currentStock,
              stockAfter: discrepancy.currentStock,
            })),
          },
        },
      });
      await tx.inventoryDocument.update({
        where: { id: documentId },
        data: {
          status: InventoryDocumentStatus.DRAFT,
          confirmedById: null,
          completedAt: null,
        },
      });

      return {
        success: true,
        type: "ADJUSTMENT_REQUIRED",
        message:
          "Phát hiện chênh lệch. Đã tạo phiếu điều chỉnh, cần xác nhận trước khi cập nhật tồn kho.",
        discrepancies: discrepancyDetails,
        adjustmentDocument: {
          id: adjustment.id,
          code: adjustment.code,
        },
      };
    }, { isolationLevel: "Serializable" });
  }
  async getInventoryHistory() {
    return this.prisma.inventoryDocument.findMany({
      where: {
        status: InventoryDocumentStatus.COMPLETED,
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
        createdBy: true,
        confirmedBy: true,
      },
      orderBy: {
        completedAt: "desc",
      },
    });
  }
}
