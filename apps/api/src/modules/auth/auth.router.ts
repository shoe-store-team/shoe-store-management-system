// import { Router, Request, Response } from 'express';

// const router = Router();

// router.get('/', (_req: Request, res: Response) => {
//   res.json({ message: 'API endpoint ready' });
// });

// export default router;

import { Router, Request, Response } from "express";
import { registerUser, loginUser } from "./auth.service";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name, phone } = req.body ?? {};

  // Kiểm tra email và mật khẩu
  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    res.status(400).json({
      message: "Email và mật khẩu là bắt buộc",
    });
    return;
  }

  // Họ tên bắt buộc
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({
      message: "Vui lòng nhập họ tên",
    });
    return;
  }

  // Số điện thoại bắt buộc
  if (typeof phone !== "string" || !phone.trim()) {
    res.status(400).json({
      message: "Vui lòng nhập số điện thoại hợp lệ",
    });
    return;
  }

  try {
    const user = await registerUser({
      email,
      password,
      name,
      phone,
    });

    res.status(201).json({
      message: "Đăng ký tài khoản thành công",
      data: user,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_EMAIL":
          res.status(400).json({
            message: "Email không hợp lệ",
          });
          return;

        case "INVALID_NAME":
          res.status(400).json({
            message: "Vui lòng nhập họ tên",
          });
          return;

        case "INVALID_PHONE":
          res.status(400).json({
            message: "Vui lòng nhập số điện thoại hợp lệ",
          });
          return;

        case "INVALID_PASSWORD":
          res.status(400).json({
            message: "Mật khẩu phải có ít nhất 8 ký tự",
          });
          return;

        case "EMAIL_EXISTS":
          res.status(409).json({
            message: "Email đã được sử dụng",
          });
          return;
      }
    }

    console.error("Register error:", error);

    res.status(500).json({
      message: "Đã xảy ra lỗi hệ thống",
    });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({
      message: "Email và mật khẩu là bắt buộc",
    });
    return;
  }

  try {
    const result = await loginUser({ email, password });

    res.status(200).json({
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_CREDENTIALS":
          res.status(401).json({
            message: "Email hoặc mật khẩu không chính xác",
          });
          return;

        case "ACCOUNT_DISABLED":
          res.status(403).json({
            message: "Tài khoản đã bị vô hiệu hóa",
          });
          return;

        case "JWT_CONFIG_ERROR":
          console.error("JWT_SECRET chưa được cấu hình");
          res.status(500).json({
            message: "Lỗi cấu hình hệ thống",
          });
          return;
      }
    }

    console.error("Login error:", error);
    res.status(500).json({
      message: "Đã xảy ra lỗi hệ thống",
    });
  }
});

export default router;
