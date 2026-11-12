import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

/** Lỗi nghiệp vụ có mã HTTP. Ném ra ở bất kỳ service nào, errorHandler sẽ trả JSON { message }. */
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Bọc handler async để lỗi tự chuyển vào errorHandler (Express 4 không tự làm). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "Không tìm thấy đường dẫn" });
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "JSON không hợp lệ" });
    return;
  }
  if (err?.code === "P2002") {
    res.status(409).json({ message: "Dữ liệu bị trùng" });
    return;
  }
  if (err?.code === "P2025") {
    res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Lỗi hệ thống" });
};
