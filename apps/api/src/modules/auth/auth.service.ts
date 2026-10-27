
import bcrypt from "bcryptjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "../../config/prisma";
import jwt from "jsonwebtoken";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error("INVALID_EMAIL");
  }

  if (!name) {
    throw new Error("INVALID_NAME");
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("INVALID_PASSWORD");
  }

  if (
    typeof input.phone !== "string" ||
    !input.phone.trim()
  ) {
    throw new Error("INVALID_PHONE");
  }

  const phone = input.phone.trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("EMAIL_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    return await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        // Không nhận role từ request đăng ký.
        // Tài khoản đăng ký mặc định là CUSTOMER.
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

  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("EMAIL_EXISTS");
    }

    throw error;
  }
}
interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Không tiết lộ email có tồn tại hay không.
  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("ACCOUNT_DISABLED");
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_CONFIG_ERROR");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "1h" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  };
}