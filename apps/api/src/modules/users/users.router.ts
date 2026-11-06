
import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  authenticateToken,
  authorizeRoles,
} from "../../middlewares/auth.middleware";
import {
  getUsers,
  updateUser,
  updateUserStatus,
} from "./users.service";

const router = Router();

// Mọi API trong router đều yêu cầu ADMIN
router.use(authenticateToken, authorizeRoles("ADMIN"));

// GET /api/users
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await getUsers();
    res.json({ data: users });
  } catch {
    res.status(500).json({ message: "Không tải được người dùng" });
  }
});

// PATCH /api/users/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = await updateUser(req.params.id as string, req.body);
    res.json({ message: "Cập nhật thành công", data: user });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        USER_NOT_FOUND: "Không tìm thấy người dùng",
        INVALID_NAME: "Họ tên không hợp lệ",
        INVALID_EMAIL: "Email không hợp lệ",
        INVALID_PHONE: "Số điện thoại không hợp lệ",
        INVALID_ROLE: "Vai trò không hợp lệ",
      };

      if (messages[error.message]) {
        const status = error.message === "USER_NOT_FOUND" ? 404 : 400;
        res.status(status).json({ message: messages[error.message] });
        return;
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({ message: "Email đã được sử dụng" });
      return;
    }

    res.status(500).json({ message: "Không thể cập nhật người dùng" });
  }
});

// PATCH /api/users/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ message: "isActive phải là boolean" });
      return;
    }

    const user = await updateUserStatus(
      req.params.id as string,
      isActive,
    );

    res.json({
      message: isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
      return;
    }

    res.status(500).json({ message: "Không thể cập nhật trạng thái" });
  }
});

export default router;
