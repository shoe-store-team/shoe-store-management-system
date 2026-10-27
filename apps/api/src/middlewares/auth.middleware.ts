
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const ROLES = [
  "CUSTOMER",
  "ADMIN",
  "WAREHOUSE_STAFF",
  "ORDER_STAFF",
] as const;

export type UserRole = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({
      message: "Vui lòng đăng nhập",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET chưa được cấu hình");
    res.status(500).json({
      message: "Lỗi cấu hình hệ thống",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !ROLES.includes(decoded.role as UserRole)
    ) {
      res.status(401).json({
        message: "Token không hợp lệ",
      });
      return;
    }

    req.authUser = {
      id: decoded.sub,
      role: decoded.role as UserRole,
    };

    next();
  } catch {
    res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({
        message: "Vui lòng đăng nhập",
      });
      return;
    }

    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
      return;
    }

    next();
  };
}
