
import { prisma } from "../../config/prisma";
import { Role } from "@prisma/client";

const editableRoles: Role[] = [
  "CUSTOMER",
  "WAREHOUSE_STAFF",
];

// 1. Danh sách khách hàng và nhân viên kho
export async function getUsers() {
  return prisma.user.findMany({
    where: {
      role: {
        in: editableRoles,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// 2. Chỉnh sửa thông tin người dùng
export async function updateUser(
  id: string,
  input: {
    name?: string;
    email?: string;
    phone?: string;
    role?: Role;
  },
) {
  const currentUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!currentUser ||
      !editableRoles.includes(currentUser.role)) {
    throw new Error("USER_NOT_FOUND");
  }

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim();

  if (name !== undefined && !name) {
    throw new Error("INVALID_NAME");
  }

  if (
    email !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("INVALID_EMAIL");
  }

  if (phone !== undefined && !phone) {
    throw new Error("INVALID_PHONE");
  }

  if (
    input.role !== undefined &&
    !editableRoles.includes(input.role)
  ) {
    throw new Error("INVALID_ROLE");
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(input.role !== undefined && { role: input.role }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

// 3. Khóa / mở khóa
export async function updateUserStatus(
  id: string,
  isActive: boolean,
) {
  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!currentUser ||
      !editableRoles.includes(currentUser.role)) {
    throw new Error("USER_NOT_FOUND");
  }

  return prisma.user.update({
    where: { id },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });
}
