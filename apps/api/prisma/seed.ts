
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ======================================================
// 1. SEED MÃ KHUYẾN MÃI
// ======================================================

async function seedPromotions() {
  // Mã khuyến mãi có thời hạn một năm kể từ lần tạo đầu tiên.
  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  const danhSachKhuyenMai = [
    {
      code: "WELCOME10",
      name: "Chào mừng khách hàng mới",
      description: "Giảm 10% cho đơn hàng từ 500.000đ.",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      maxDiscount: 150000,
      minOrderAmount: 500000,
      usageLimit: 500,
    },
    {
      code: "SALE15",
      name: "Ưu đãi giảm 15%",
      description: "Giảm 15%, tối đa 300.000đ.",
      discountType: "PERCENTAGE" as const,
      discountValue: 15,
      maxDiscount: 300000,
      minOrderAmount: 1000000,
      usageLimit: 200,
    },
    {
      code: "CHUATAYDAU",
      name: "Giảm ngay 50.000đ",
      description: "Giảm trực tiếp 50.000đ cho đơn hàng từ 300.000đ.",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 50000,
      maxDiscount: null,
      minOrderAmount: 300000,
      usageLimit: 300,
    },
    {
      code: "GIAM100K",
      name: "Giảm ngay 100.000đ",
      description: "Giảm trực tiếp 100.000đ cho đơn hàng từ 1.500.000đ.",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 100000,
      maxDiscount: null,
      minOrderAmount: 1500000,
      usageLimit: 100,
    },
  ];

  for (const km of danhSachKhuyenMai) {
    await prisma.promotion.upsert({
      where: {
        code: km.code,
      },
      update: {},
      create: {
        code: km.code,
        name: km.name,
        description: km.description,
        discountType: km.discountType,
        discountValue: km.discountValue,
        maxDiscount: km.maxDiscount,
        minOrderAmount: km.minOrderAmount,
        startsAt,
        endsAt,
        usageLimit: km.usageLimit,
        usageCount: 0,
        isActive: true,
      },
    });

    console.log(`Đã kiểm tra mã khuyến mãi: ${km.code}`);
  }

  console.log(`Đã xử lý ${danhSachKhuyenMai.length} mã khuyến mãi.`);
}

// ======================================================
// 2. KIỂU DỮ LIỆU SEED SẢN PHẨM
// ======================================================

type MauSanPham = {
  productCode: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  sizes: number[];
  colors: {
    color: string;
    imageUrl: string;
  }[];
  // Giữ lại SKU và tồn kho của các biến thể ban đầu.
  legacyVariants: {
    sku: string;
    size: number;
    color: string;
    initialStock: number;
  }[];
};

// ======================================================
// 3. SEED DỮ LIỆU CHÍNH
// ======================================================

async function main() {
  // Tạo tài khoản Admin nếu chưa tồn tại.
  const adminEmail = "admin@shoestore.com";
  const adminPassword = "Admin123";

  if (!adminPassword) {
    throw new Error("Vui lòng cấu hình ADMIN_PASSWORD trong .env");
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Admin",
      phone: "0900000000",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`Đã kiểm tra tài khoản Admin: ${adminEmail}`);

  // 1. Tạo danh mục nếu chưa tồn tại.
  const tenDanhMuc = [
    "Giày thể thao",
    "Giày chạy bộ",
    "Giày bóng rổ",
    "Giày thời trang",
  ];

  const danhMucTheoTen: Record<string, string> = {};

  for (const ten of tenDanhMuc) {
    const danhMuc = await prisma.category.upsert({
      where: {
        name: ten,
      },
      update: {},
      create: {
        name: ten,
      },
    });

    danhMucTheoTen[ten] = danhMuc.id;
  }

  // 2. Danh sách 12 sản phẩm và 21 ảnh theo màu.
  // Mỗi màu của một sản phẩm dùng chung danh sách size.
  const sanPhamMau: MauSanPham[] = [
    {
      productCode: "SP00001",
      name: "Nike Air Demo",
      description: "Giày thể thao phong cách năng động.",
      basePrice: 1500000,
      category: "Giày thể thao",
      sizes: [40, 41, 42],
      colors: [
        { color: "Red", imageUrl: "/images/products/1-do.jpg" },
        { color: "Green", imageUrl: "/images/products/1-xanh.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00001-V001", size: 40, color: "Red", initialStock: 10 },
        { sku: "SP00001-V002", size: 41, color: "Red", initialStock: 8 },
        { sku: "SP00001-V003", size: 42, color: "Green", initialStock: 6 },
      ],
    },
    {
      productCode: "SP00002",
      name: "Adidas Run Demo",
      description: "Giày chạy bộ nhẹ, phù hợp vận động hằng ngày.",
      basePrice: 1800000,
      category: "Giày chạy bộ",
      sizes: [40, 41, 42],
      colors: [
        { color: "Gray", imageUrl: "/images/products/2-xam.jpg" },
        { color: "Blue", imageUrl: "/images/products/2-xanh.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00002-V001", size: 40, color: "Gray", initialStock: 8 },
        { sku: "SP00002-V002", size: 41, color: "Gray", initialStock: 8 },
        { sku: "SP00002-V003", size: 42, color: "Blue", initialStock: 5 },
      ],
    },
    {
      productCode: "SP00003",
      name: "Street Runner",
      description: "Giày thể thao phù hợp đi học và đi chơi.",
      basePrice: 950000,
      category: "Giày thể thao",
      sizes: [39, 40],
      colors: [
        { color: "Beige", imageUrl: "/images/products/3-da.jpg" },
        { color: "Gray", imageUrl: "/images/products/3-xam.jpg" },
        { color: "Blue", imageUrl: "/images/products/3-xanh.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00003-V001", size: 39, color: "Blue", initialStock: 7 },
        { sku: "SP00003-V002", size: 40, color: "Blue", initialStock: 7 },
      ],
    },
    {
      productCode: "SP00004",
      name: "Urban Classic",
      description: "Giày thời trang kiểu dáng đơn giản.",
      basePrice: 890000,
      category: "Giày thời trang",
      sizes: [39, 40],
      colors: [
        { color: "Black", imageUrl: "/images/products/4-den.jpg" },
        { color: "Red", imageUrl: "/images/products/4-do.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00004-V001", size: 39, color: "Black", initialStock: 5 },
        { sku: "SP00004-V002", size: 40, color: "Black", initialStock: 5 },
      ],
    },
    {
      productCode: "SP00005",
      name: "Speed Runner",
      description: "Giày chạy bộ dành cho các buổi tập luyện.",
      basePrice: 1250000,
      category: "Giày chạy bộ",
      sizes: [40, 41],
      colors: [
        { color: "Black", imageUrl: "/images/products/5-den.jpg" },
        { color: "Red", imageUrl: "/images/products/5-do.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00005-V001", size: 40, color: "Black", initialStock: 8 },
        { sku: "SP00005-V002", size: 41, color: "Black", initialStock: 6 },
      ],
    },
    {
      productCode: "SP00006",
      name: "Court Pro",
      description: "Giày bóng rổ cổ cao phong cách thể thao.",
      basePrice: 2100000,
      category: "Giày bóng rổ",
      sizes: [41, 42],
      colors: [
        { color: "Red", imageUrl: "/images/products/6-do.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00006-V001", size: 41, color: "Red", initialStock: 5 },
        { sku: "SP00006-V002", size: 42, color: "Red", initialStock: 5 },
      ],
    },
    {
      productCode: "SP00007",
      name: "Hoop Flex",
      description: "Giày bóng rổ dành cho hoạt động trong sân.",
      basePrice: 1950000,
      category: "Giày bóng rổ",
      sizes: [40, 42],
      colors: [
        { color: "Yellow", imageUrl: "/images/products/7-vang.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00007-V001", size: 40, color: "Yellow", initialStock: 4 },
        { sku: "SP00007-V002", size: 42, color: "Yellow", initialStock: 4 },
      ],
    },
    {
      productCode: "SP00008",
      name: "Daily Walk",
      description: "Giày đi bộ thoải mái khi sử dụng hằng ngày.",
      basePrice: 750000,
      category: "Giày thể thao",
      sizes: [39, 40],
      colors: [
        { color: "Green", imageUrl: "/images/products/8-xanhla.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00008-V001", size: 39, color: "Green", initialStock: 9 },
        { sku: "SP00008-V002", size: 40, color: "Green", initialStock: 9 },
      ],
    },
    {
      productCode: "SP00009",
      name: "Canvas Street",
      description: "Giày phong cách đường phố trẻ trung.",
      basePrice: 650000,
      category: "Giày thời trang",
      sizes: [38, 39],
      colors: [
        { color: "Black", imageUrl: "/images/products/9-den.jpg" },
        { color: "Blue", imageUrl: "/images/products/9-xanh.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00009-V001", size: 38, color: "Black", initialStock: 6 },
        { sku: "SP00009-V002", size: 39, color: "Black", initialStock: 6 },
      ],
    },
    {
      productCode: "SP00010",
      name: "Light Move",
      description: "Giày nhẹ dành cho đi bộ và vận động.",
      basePrice: 1100000,
      category: "Giày chạy bộ",
      sizes: [40, 41],
      colors: [
        { color: "White", imageUrl: "/images/products/10-trang.jpg" },
        { color: "Blue", imageUrl: "/images/products/10-xanh.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00010-V001", size: 40, color: "White", initialStock: 7 },
        { sku: "SP00010-V002", size: 41, color: "Blue", initialStock: 7 },
      ],
    },
    {
      productCode: "SP00011",
      name: "Active Sport",
      description: "Giày thể thao đa dụng cho sinh hoạt hằng ngày.",
      basePrice: 1350000,
      category: "Giày thể thao",
      sizes: [41, 42],
      colors: [
        { color: "Green", imageUrl: "/images/products/11-xanhla.jpg" },
        { color: "Aqua", imageUrl: "/images/products/11-xanhnuoc.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00011-V001", size: 41, color: "Green", initialStock: 5 },
        { sku: "SP00011-V002", size: 42, color: "Green", initialStock: 5 },
      ],
    },
    {
      productCode: "SP00012",
      name: "Classic Sneaker",
      description: "Giày sneaker cổ điển, dễ phối đồ.",
      basePrice: 990000,
      category: "Giày thời trang",
      sizes: [39, 40],
      colors: [
        { color: "Black", imageUrl: "/images/products/12-den.jpg" },
      ],
      legacyVariants: [
        { sku: "SP00012-V001", size: 39, color: "Black", initialStock: 6 },
        { sku: "SP00012-V002", size: 40, color: "Black", initialStock: 6 },
      ],
    },
  ];

  // 3. Tạo hoặc cập nhật sản phẩm theo productCode.
  for (const sp of sanPhamMau) {
    const categoryId = danhMucTheoTen[sp.category];

    if (!categoryId) {
      throw new Error(`Không tìm thấy danh mục: ${sp.category}`);
    }

    // Ảnh đại diện sản phẩm lấy từ ảnh màu đầu tiên.
    const anhDaiDien = sp.colors[0]?.imageUrl;

    if (!anhDaiDien) {
      throw new Error(`Sản phẩm ${sp.productCode} chưa có ảnh biến thể.`);
    }

    const sanPham = await prisma.product.upsert({
      where: {
        productCode: sp.productCode,
      },
      update: {
        name: sp.name,
        description: sp.description,
        basePrice: sp.basePrice,
        imageUrl: anhDaiDien,
        categoryId,
        isActive: true,
      },
      create: {
        productCode: sp.productCode,
        name: sp.name,
        description: sp.description,
        basePrice: sp.basePrice,
        imageUrl: anhDaiDien,
        categoryId,
        isActive: true,
      },
    });

    // 4. Mỗi màu có đầy đủ các size của sản phẩm.
    const bienTheTheoSanPham = sp.colors.flatMap((mau) =>
      sp.sizes.map((size) => {
        const bienTheCu = sp.legacyVariants.find(
          (item) =>
            item.size === size && item.color === mau.color,
        );

        return {
          sku:
            bienTheCu?.sku ??
            `${sp.productCode}-${mau.color.toUpperCase()}-${size}`,
          size,
          color: mau.color,
          imageUrl: mau.imageUrl,
          initialStock: bienTheCu?.initialStock ?? 0,
        };
      }),
    );

    // 5. Tạo hoặc cập nhật từng biến thể.
    for (const bienThe of bienTheTheoSanPham) {
      await prisma.productVariant.upsert({
        where: {
          sku: bienThe.sku,
        },
        update: {
          productId: sanPham.id,
          size: bienThe.size,
          color: bienThe.color,
          imageUrl: bienThe.imageUrl,
          isActive: true,
        },
        create: {
          productId: sanPham.id,
          sku: bienThe.sku,
          size: bienThe.size,
          color: bienThe.color,
          imageUrl: bienThe.imageUrl,
          stock: bienThe.initialStock,
          isActive: true,
        },
      });
    }

    console.log(
      `Đã xử lý sản phẩm: ${sp.productCode} - ${sp.name}`,
    );
  }

  // 6. Tạo các mã khuyến mãi.
  await seedPromotions();

  console.log("----------------------------------");
  console.log(`Đã xử lý ${sanPhamMau.length} sản phẩm.`);
  console.log(`Đã xử lý ${tenDanhMuc.length} danh mục.`);
  console.log("Seed hoàn tất!");
}

// ======================================================
// 4. CHẠY SEED
// ======================================================

main()
  .catch((error) => {
    console.error("Lỗi tạo dữ liệu seed:", error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
