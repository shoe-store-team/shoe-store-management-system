import {
  InventoryDocumentStatus,
  InventoryDocumentType,
  Role,
} from "@prisma/client";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { InventoryService } from "./inventory.service";

const router = Router();
const inventoryService = new InventoryService(prisma);
const supportedTypes: InventoryDocumentType[] = [
  InventoryDocumentType.IMPORT,
  InventoryDocumentType.EXPORT,
  InventoryDocumentType.COUNT,
  InventoryDocumentType.ADJUSTMENT,
];

type InventoryItemInput = {
  variantId: string;
  quantity?: number;
  countedStock?: number;
  unitCost?: number | null;
  note?: string;
};

function respondWithError(res: Response, error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const possibleError = error as {
      statusCode?: unknown;
      getStatus?: () => unknown;
      message?: unknown;
      name?: unknown;
      code?: unknown;
    };
    if (possibleError.code === "P2034") {
      return res.status(409).json({
        message:
          "Phiếu kho hoặc tồn kho vừa được cập nhật đồng thời. Hãy tải lại và thử lại.",
      });
    }
    const statusCode =
      typeof possibleError.getStatus === "function"
        ? possibleError.getStatus()
        : possibleError.statusCode;
    if (
      typeof statusCode === "number" &&
      statusCode >= 400 &&
      statusCode < 500
    ) {
      return res.status(statusCode).json({
        message:
          typeof possibleError.message === "string"
            ? possibleError.message
            : fallback,
      });
    }
    if (
      possibleError.name === "BadRequestException" ||
      possibleError.name === "NotFoundException"
    ) {
      return res
        .status(possibleError.name === "NotFoundException" ? 404 : 400)
        .json({
          message:
            typeof possibleError.message === "string"
              ? possibleError.message
              : fallback,
        });
    }
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

function parseItems(value: unknown): InventoryItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const items: InventoryItemInput[] = [];
  for (const entry of value) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("variantId" in entry) ||
      typeof entry.variantId !== "string" ||
      entry.variantId.trim() === ""
    ) {
      return null;
    }

    const item = entry as Record<string, unknown>;
    if (
      (item.quantity !== undefined &&
        (typeof item.quantity !== "number" ||
          !Number.isInteger(item.quantity))) ||
      (item.countedStock !== undefined &&
        (typeof item.countedStock !== "number" ||
          !Number.isInteger(item.countedStock))) ||
      (item.unitCost !== undefined &&
        item.unitCost !== null &&
        (typeof item.unitCost !== "number" ||
          !Number.isFinite(item.unitCost))) ||
      (item.note !== undefined && typeof item.note !== "string")
    ) {
      return null;
    }

    items.push({
      variantId: entry.variantId,
      quantity: item.quantity as number | undefined,
      countedStock: item.countedStock as number | undefined,
      unitCost: item.unitCost as number | null | undefined,
      note: item.note as string | undefined,
    });
  }
  return items;
}

function validateDocumentItems(
  type: InventoryDocumentType,
  items: InventoryItemInput[],
) {
  for (const item of items) {
    if (type === InventoryDocumentType.COUNT) {
      if (
        !Number.isInteger(item.countedStock) ||
        (item.countedStock as number) < 0
      ) {
        return "Số lượng kiểm kê phải là số nguyên không âm.";
      }
    } else if (type === InventoryDocumentType.ADJUSTMENT) {
      if (!Number.isInteger(item.quantity) || (item.quantity as number) < 0) {
        return "Tồn kho điều chỉnh phải là số nguyên không âm.";
      }
    } else if (
      !Number.isInteger(item.quantity) ||
      (item.quantity as number) <= 0
    ) {
      return "Số lượng phải là số nguyên lớn hơn 0.";
    }

    if (
      item.unitCost !== undefined &&
      item.unitCost !== null &&
      item.unitCost < 0
    ) {
      return "Đơn giá nhập không được âm.";
    }
  }
  return null;
}

router.get("/variants", async (_req: Request, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: {
        product: { select: { id: true, name: true, basePrice: true } },
      },
      orderBy: [
        { product: { name: "asc" } },
        { size: "asc" },
        { color: "asc" },
      ],
    });
    return res.json(variants);
  } catch (error) {
    return respondWithError(
      res,
      error,
      "Không thể lấy danh sách biến thể tồn kho.",
    );
  }
});

router.get("/operators", async (_req: Request, res: Response) => {
  try {
    const operators = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.ADMIN, Role.WAREHOUSE_STAFF] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return res.json(operators);
  } catch (error) {
    return respondWithError(
      res,
      error,
      "Không thể lấy danh sách nhân viên kho.",
    );
  }
});

router.get("/history", async (_req: Request, res: Response) => {
  try {
    const history = await inventoryService.getInventoryHistory();
    const variantIds = [
      ...new Set(
        history.flatMap((document) =>
          document.items.map((item) => item.variantId),
        ),
      ),
    ];
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, name: true } } },
    });
    const variantById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );
    return res.json(
      history.map((document) => ({
        ...document,
        note:
          document.note
            ?.replace(/\[\[inventory-count:[^\]]+\]\]/g, "")
            .trim() || null,
        items: document.items.map((item) => ({
          ...item,
          variant: variantById.get(item.variantId) ?? item.variant,
        })),
      })),
    );
  } catch (error) {
    return respondWithError(res, error, "Không thể lấy lịch sử kho.");
  }
});

router.post("/documents", async (req: Request, res: Response) => {
  const { type, createdById, reason, note } = req.body ?? {};
  const items = parseItems(req.body?.items);
  if (
    typeof type !== "string" ||
    !supportedTypes.includes(type as InventoryDocumentType) ||
    typeof createdById !== "string" ||
    createdById.trim() === "" ||
    (reason !== undefined && typeof reason !== "string") ||
    (note !== undefined && typeof note !== "string") ||
    !items ||
    new Set(items.map((item) => item.variantId)).size !== items.length
  ) {
    return res
      .status(400)
      .json({ message: "Dữ liệu tạo phiếu kho không hợp lệ." });
  }
  const itemValidationError = validateDocumentItems(
    type as InventoryDocumentType,
    items,
  );
  if (itemValidationError) {
    return res.status(400).json({ message: itemValidationError });
  }

  try {
    const operator = await prisma.user.findFirst({
      where: {
        id: createdById,
        isActive: true,
        role: { in: [Role.ADMIN, Role.WAREHOUSE_STAFF] },
      },
      select: { id: true },
    });
    if (!operator) {
      return res.status(400).json({ message: "Người lập phiếu không hợp lệ." });
    }

    const existingVariants = await prisma.productVariant.findMany({
      where: {
        id: { in: items.map((item) => item.variantId) },
        isActive: true,
        product: { isActive: true },
      },
      select: { id: true },
    });
    if (existingVariants.length !== items.length) {
      return res.status(400).json({
        message: "Có biến thể không tồn tại hoặc đã ngừng hoạt động.",
      });
    }

    const document = await inventoryService.createInventoryDocument({
      type: type as InventoryDocumentType,
      createdById,
      reason,
      note,
      variantIds: items.map((item) => item.variantId),
    });
    if (document.items.length !== items.length) {
      return res
        .status(400)
        .json({ message: "Không thể tạo phiếu cho các biến thể đã chọn." });
    }

    if (type !== InventoryDocumentType.COUNT) {
      await prisma.$transaction(
        items.map((item) =>
          prisma.inventoryDocumentItem.update({
            where: {
              documentId_variantId: {
                documentId: document.id,
                variantId: item.variantId,
              },
            },
            data: {
              quantity: item.quantity,
              unitCost: item.unitCost,
              note: item.note,
            },
          }),
        ),
      );
    }

    return res.status(201).json(document);
  } catch (error) {
    return respondWithError(res, error, "Không thể tạo phiếu kho.");
  }
});

router.put("/documents/:id/items", async (req: Request, res: Response) => {
  const items = parseItems(req.body?.items);
  const documentId = req.params.id;
  if (
    !items ||
    typeof documentId !== "string" ||
    new Set(items.map((item) => item.variantId)).size !== items.length
  ) {
    return res
      .status(400)
      .json({ message: "Danh sách dòng phiếu kho không hợp lệ." });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const document = await tx.inventoryDocument.findUnique({
          where: { id: documentId },
          include: { items: { select: { variantId: true } } },
        });
        if (!document) {
          return {
            statusCode: 404,
            body: { message: "Không tìm thấy phiếu kho." },
          };
        }
        if (document.status !== InventoryDocumentStatus.DRAFT) {
          return {
            statusCode: 400,
            body: {
              message: "Chỉ có thể cập nhật phiếu kho đang ở trạng thái nháp.",
            },
          };
        }
        if (
          items.some(
            (item) =>
              !document.items.some(
                (entry) => entry.variantId === item.variantId,
              ),
          )
        ) {
          return {
            statusCode: 400,
            body: { message: "Biến thể không thuộc phiếu kho cần cập nhật." },
          };
        }

        const validationError = validateDocumentItems(document.type, items);
        if (validationError) {
          return { statusCode: 400, body: { message: validationError } };
        }

        for (const item of items) {
          await tx.inventoryDocumentItem.update({
            where: {
              documentId_variantId: { documentId, variantId: item.variantId },
            },
            data:
              document.type === InventoryDocumentType.COUNT
                ? { countedStock: item.countedStock }
                : {
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    note: item.note,
                  },
          });
        }
        return {
          statusCode: 200,
          body: { success: true, message: "Đã cập nhật các dòng phiếu kho." },
        };
      },
      { isolationLevel: "Serializable" },
    );
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return respondWithError(res, error, "Không thể cập nhật phiếu kho.");
  }
});

router.post("/documents/:id/confirm", async (req: Request, res: Response) => {
  const { confirmedById } = req.body ?? {};
  const documentId = req.params.id;
  if (
    typeof confirmedById !== "string" ||
    confirmedById.trim() === "" ||
    typeof documentId !== "string"
  ) {
    return res.status(400).json({ message: "Thiếu người xác nhận phiếu kho." });
  }

  try {
    const operator = await prisma.user.findFirst({
      where: {
        id: confirmedById,
        isActive: true,
        role: { in: [Role.ADMIN, Role.WAREHOUSE_STAFF] },
      },
      select: { id: true },
    });
    if (!operator) {
      return res.status(400).json({ message: "Người xác nhận không hợp lệ." });
    }

    const document = await prisma.inventoryDocument.findUnique({
      where: { id: documentId },
      select: { type: true },
    });
    if (!document) {
      return res.status(404).json({ message: "Không tìm thấy phiếu kho." });
    }

    const result =
      document.type === InventoryDocumentType.COUNT
        ? await inventoryService.processAuditDocument(documentId, confirmedById)
        : await inventoryService.confirmDocument(documentId, confirmedById);
    return res.json(result);
  } catch (error) {
    return respondWithError(res, error, "Không thể xác nhận phiếu kho.");
  }
});
router.post("/documents/:id/cancel", async (req: Request, res: Response) => {
  const documentId = req.params.id;

  if (typeof documentId !== "string") {
    return res.status(400).json({ message: "Mã phiếu không hợp lệ." });
  }

  try {
    const result = await inventoryService.cancelDocument(documentId);
    return res.json(result);
  } catch (error) {
    return respondWithError(res, error, "Không thể hủy phiếu kho.");
  }
});
// Trừ tồn kho theo đơn hàng
router.post("/orders/:orderId/deduct", async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { actorId, reason, items } = req.body ?? {};
  const parsedItems = parseItems(items);

  if (
    typeof orderId !== "string" ||
    !orderId.trim() ||
    typeof actorId !== "string" ||
    !actorId.trim() ||
    !parsedItems
  ) {
    return res.status(400).json({ message: "Dữ liệu trừ kho đơn hàng không hợp lệ." });
  }

  try {
    const result = await inventoryService.deductStockForOrder({
      orderId,
      actorId,
      reason,
      items: parsedItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity ?? 0,
      })),
    });
    return res.json(result);
  } catch (error) {
    return respondWithError(res, error, "Không thể trừ tồn kho cho đơn hàng.");
  }
});

// Hoàn tồn kho khi đơn hàng bị hủy hoặc thanh toán thất bại/hết hạn
router.post("/orders/:orderId/restore", async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { actorId, reason } = req.body ?? {};

  if (typeof orderId !== "string" || !orderId.trim()) {
    return res.status(400).json({ message: "Mã đơn hàng không hợp lệ." });
  }

  try {
    const result = await inventoryService.restoreStockForOrder({
      orderId,
      actorId: typeof actorId === "string" ? actorId : undefined,
      reason: typeof reason === "string" ? reason : undefined,
    });
    return res.json(result);
  } catch (error) {
    return respondWithError(res, error, "Không thể hoàn tồn kho cho đơn hàng.");
  }
});
export default router;
