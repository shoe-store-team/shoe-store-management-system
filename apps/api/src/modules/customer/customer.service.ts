
import { prisma } from "../../config/prisma";

type AddressData = {
  recipientName?: string;
  phone?: string;
  addressLine?: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault?: boolean;
};

const profileSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
};

// PROFILE

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
}

export async function updateProfile(
  userId: string,
  data: { name?: string; phone?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: profileSelect,
  });
}

// ADDRESS

export async function getAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(
  userId: string,
  data: Required<Pick<AddressData, "recipientName" | "phone" | "addressLine">> &
    AddressData,
) {
  return prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId,
        recipientName: data.recipientName.trim(),
        phone: data.phone.trim(),
        addressLine: data.addressLine.trim(),
        ward: data.ward?.trim() || null,
        district: data.district?.trim() || null,
        province: data.province?.trim() || null,
        isDefault: data.isDefault === true,
      },
    });
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: AddressData,
) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!address) return null;

  return prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...(data.recipientName !== undefined
          ? { recipientName: data.recipientName.trim() }
          : {}),
        ...(data.phone !== undefined
          ? { phone: data.phone.trim() }
          : {}),
        ...(data.addressLine !== undefined
          ? { addressLine: data.addressLine.trim() }
          : {}),
        ...(data.ward !== undefined
          ? { ward: data.ward?.trim() || null }
          : {}),
        ...(data.district !== undefined
          ? { district: data.district?.trim() || null }
          : {}),
        ...(data.province !== undefined
          ? { province: data.province?.trim() || null }
          : {}),
        ...(data.isDefault !== undefined
          ? { isDefault: data.isDefault }
          : {}),
      },
    });
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!address) return null;

  return prisma.address.delete({
    where: { id: addressId },
  });
}
