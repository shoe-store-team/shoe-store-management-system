import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = Router();

// Xem thông tin tài khoản đang đăng nhập
router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        message: "Tài khoản đã bị vô hiệu hóa",
      });
      return;
    }

    res.status(200).json({
      message: "Lấy thông tin tài khoản thành công",
      data: user,
    });
  } catch (error) {
    console.error("Get customer profile error:", error);

    res.status(500).json({
      message: "Đã xảy ra lỗi hệ thống",
    });
  }
});

// Giữ nguyên route mẫu hiện tại
router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API endpoint ready" });
});

// Cập nhật thông tin cá nhân
router.patch("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;

    if (name === undefined && phone === undefined) {
      res.status(400).json({
        message: "Vui lòng cung cấp thông tin cần cập nhật",
      });
      return;
    }

    if (
      (name !== undefined && (typeof name !== "string" || !name.trim())) ||
      (phone !== undefined && (typeof phone !== "string" || !phone.trim()))
    ) {
      res.status(400).json({
        message: "Tên hoặc số điện thoại không hợp lệ",
      });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
      select: { id: true, isActive: true },
    });

    if (!currentUser) {
      res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
      return;
    }

    if (!currentUser.isActive) {
      res.status(403).json({
        message: "Tài khoản đã bị vô hiệu hóa",
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      message: "Cập nhật thông tin thành công",
      data: user,
    });
  } catch (error) {
    console.error("Update customer profile error:", error);
    res.status(500).json({
      message: "Đã xảy ra lỗi hệ thống",
    });
  }
});

// ================================
// CRUD ĐỊA CHỈ GIAO HÀNG
// ================================

// 1. Xem danh sách địa chỉ
router.get(
  "/addresses",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const addresses = await prisma.address.findMany({
        where: { userId: req.authUser!.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });

      res.status(200).json({
        message: "Lấy danh sách địa chỉ thành công",
        data: addresses,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi hệ thống" });
    }
  },
);

// 2. Thêm địa chỉ
router.post(
  "/addresses",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const {
        recipientName,
        phone,
        addressLine,
        ward,
        district,
        province,
        isDefault,
      } = req.body;

      if (
        typeof recipientName !== "string" ||
        !recipientName.trim() ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof addressLine !== "string" ||
        !addressLine.trim() ||
        (ward !== undefined && ward !== null && typeof ward !== "string") ||
        (district !== undefined &&
          district !== null &&
          typeof district !== "string") ||
        (province !== undefined &&
          province !== null &&
          typeof province !== "string") ||
        (isDefault !== undefined && typeof isDefault !== "boolean")
      ) {
        res.status(400).json({ message: "Thông tin địa chỉ không hợp lệ" });
        return;
      }

      const userId = req.authUser!.id;

      const address = await prisma.$transaction(async (tx) => {
        if (isDefault === true) {
          await tx.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
        }

        return tx.address.create({
          data: {
            userId,
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            addressLine: addressLine.trim(),
            ward: ward?.trim() || null,
            district: district?.trim() || null,
            province: province?.trim() || null,
            isDefault: isDefault === true,
          },
        });
      });

      res.status(201).json({
        message: "Thêm địa chỉ thành công",
        data: address,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi hệ thống" });
    }
  },
);

// 3. Sửa địa chỉ
router.patch(
  "/addresses/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const {
        recipientName,
        phone,
        addressLine,
        ward,
        district,
        province,
        isDefault,
      } = req.body;

      const allowed = [
        "recipientName",
        "phone",
        "addressLine",
        "ward",
        "district",
        "province",
        "isDefault",
      ];

      if (
        Object.keys(req.body).length === 0 ||
        Object.keys(req.body).some((key) => !allowed.includes(key))
      ) {
        res.status(400).json({ message: "Dữ liệu cập nhật không hợp lệ" });
        return;
      }

      if (
        (recipientName !== undefined &&
          (typeof recipientName !== "string" || !recipientName.trim())) ||
        (phone !== undefined && (typeof phone !== "string" || !phone.trim())) ||
        (addressLine !== undefined &&
          (typeof addressLine !== "string" || !addressLine.trim())) ||
        (ward !== undefined && ward !== null && typeof ward !== "string") ||
        (district !== undefined &&
          district !== null &&
          typeof district !== "string") ||
        (province !== undefined &&
          province !== null &&
          typeof province !== "string") ||
        (isDefault !== undefined && typeof isDefault !== "boolean")
      ) {
        res.status(400).json({ message: "Thông tin cập nhật không hợp lệ" });
        return;
      }

      const userId = req.authUser!.id;
      const addressId = String(req.params.id);

      const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!address) {
        res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (isDefault === true) {
          await tx.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
        }

        return tx.address.update({
          where: { id: addressId },
          data: {
            ...(recipientName !== undefined
              ? { recipientName: recipientName.trim() }
              : {}),
            ...(phone !== undefined ? { phone: phone.trim() } : {}),
            ...(addressLine !== undefined
              ? { addressLine: addressLine.trim() }
              : {}),
            ...(ward !== undefined ? { ward: ward?.trim() || null } : {}),
            ...(district !== undefined
              ? { district: district?.trim() || null }
              : {}),
            ...(province !== undefined
              ? { province: province?.trim() || null }
              : {}),
            ...(isDefault !== undefined ? { isDefault } : {}),
          },
        });
      });

      res.status(200).json({
        message: "Cập nhật địa chỉ thành công",
        data: updated,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi hệ thống" });
    }
  },
);

// 4. Xóa địa chỉ
router.delete(
  "/addresses/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.authUser!.id;

      const addressId = String(req.params.id);
      const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!address) {
        res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        return;
      }

      await prisma.address.delete({
        where: { id: addressId },
      });

      res.status(200).json({
        message: "Xóa địa chỉ thành công",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi hệ thống" });
    }
  },
);

export default router;
