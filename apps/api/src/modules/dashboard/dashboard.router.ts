import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { DashboardError, getSummary } from "./dashboard.service";

/** Chỉ ADMIN. Nếu auth.middleware của nhóm đã có hàm kiểm tra quyền (VD requireRole), có thể thay requireAdmin bằng hàm đó. */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req.authUser as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    res.status(403).json({ message: "Chỉ quản trị viên được xem thống kê." });
    return;
  }
  next();
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export const dashboardRouter = Router();

// GET /api/dashboard/summary?from=2026-11-01&to=2026-11-14&lowStock=5
dashboardRouter.get("/summary", authenticateToken, requireAdmin, (req, res, next) => {
  const lowStockRaw = str(req.query.lowStock);
  const lowStock = lowStockRaw === undefined ? undefined : Number(lowStockRaw);
  if (lowStock !== undefined && (!Number.isInteger(lowStock) || lowStock < 0 || lowStock > 1000)) {
    res.status(400).json({ message: "lowStock phải là số nguyên 0–1000." });
    return;
  }
  getSummary({ from: str(req.query.from), to: str(req.query.to), lowStock })
    .then((data) => res.json(data))
    .catch(next);
});

// Express nhận diện error handler nhờ đủ 4 tham số, nên phải giữ `next`
dashboardRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof DashboardError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  console.error("[dashboard]", err);
  res.status(500).json({ message: "Không tải được số liệu thống kê." });
});

export default dashboardRouter;
