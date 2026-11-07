//  import type { NextFunction, Request, RequestHandler, Response } from 'express';
 import type { Request, RequestHandler, Response } from 'express';
import { prisma } from '../../config/prisma';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Bọc handler async: HttpError -> JSON { message }, lỗi khác -> error middleware. */
export const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  };

/**
 * Lấy id người dùng đang đăng nhập.
 * - Khi auth.middleware (Người 1) xong và gắn req.user = { id, role } thì dùng luôn.
 * - Tạm thời ở môi trường dev: đọc header `x-user-id` để test khi chưa có đăng nhập.
 * TODO: xóa nhánh x-user-id khi auth hoàn thiện.
 */
export function currentUserId(req: Request): string {
 const user = req.authUser as { id?: string } | undefined;
  if (user?.id) return user.id;
  if (process.env.NODE_ENV !== 'production') {
    const header = req.header('x-user-id');
    if (header) return header;
  }
  throw new HttpError(401, 'Bạn chưa đăng nhập');
}

export async function assertAdmin(req: Request): Promise<void> {
  const id = currentUserId(req);
  const role =
    (req.authUser?.role as string | undefined) ??
    (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role;
  if (role !== 'ADMIN') throw new HttpError(403, 'Chỉ quản trị viên được thực hiện thao tác này');
}

/** Lấy :id từ URL (Express 5 có thể trả string | string[]). */
export function idParam(req: Request): string {
  const id = req.params.id;
  if (typeof id !== 'string' || !id) throw new HttpError(400, 'ID không hợp lệ');
  return id;
}
