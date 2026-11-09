
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

      // Nếu mã đã tồn tại thì không ghi đè dữ liệu.
      // Đặc biệt không đặt lại usageCount.
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
// 2. SEED DỮ LIỆU CHÍNH
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

  // 2. Dữ liệu 12 sản phẩm và các biến thể size/màu.
  // stock chỉ được sử dụng khi tạo biến thể mới.
  const sanPhamMau = [
    {
      productCode: "SP00001",
      name: "Nike Air Demo",
      description: "Giày thể thao phong cách năng động.",
      basePrice: 1500000,
      imageUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
      category: "Giày thể thao",
      variants: [
        { size: 40, color: "Red", stock: 10 },
        { size: 41, color: "Red", stock: 8 },
        { size: 42, color: "Black", stock: 6 },
      ],
    },
    {
      productCode: "SP00002",
      name: "Adidas Run Demo",
      description: "Giày chạy bộ nhẹ, phù hợp vận động hằng ngày.",
      basePrice: 1800000,
      imageUrl:
        "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80",
      category: "Giày chạy bộ",
      variants: [
        { size: 40, color: "White", stock: 8 },
        { size: 41, color: "White", stock: 8 },
        { size: 42, color: "Black", stock: 5 },
      ],
    },
    {
      productCode: "SP00003",
      name: "Street Runner",
      description: "Giày thể thao phù hợp đi học và đi chơi.",
      basePrice: 950000,
      imageUrl:
        "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80",
      category: "Giày thể thao",
      variants: [
        { size: 39, color: "White", stock: 7 },
        { size: 40, color: "White", stock: 7 },
      ],
    },
    {
      productCode: "SP00004",
      name: "Urban Classic",
      description: "Giày thời trang kiểu dáng đơn giản.",
      basePrice: 890000,
      imageUrl:
        "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=900&q=80",
      category: "Giày thời trang",
      variants: [
        { size: 39, color: "Black", stock: 5 },
        { size: 40, color: "Black", stock: 5 },
      ],
    },
    {
      productCode: "SP00005",
      name: "Speed Runner",
      description: "Giày chạy bộ dành cho các buổi tập luyện.",
      basePrice: 1250000,
      imageUrl:
        "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80",
      category: "Giày chạy bộ",
      variants: [
        { size: 40, color: "Blue", stock: 8 },
        { size: 41, color: "Blue", stock: 6 },
      ],
    },
    {
      productCode: "SP00006",
      name: "Court Pro",
      description: "Giày bóng rổ cổ cao phong cách thể thao.",
      basePrice: 2100000,
      imageUrl:
        "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=900&q=80",
      category: "Giày bóng rổ",
      variants: [
        { size: 41, color: "Black", stock: 5 },
        { size: 42, color: "Black", stock: 5 },
      ],
    },
    {
      productCode: "SP00007",
      name: "Hoop Flex",
      description: "Giày bóng rổ dành cho hoạt động trong sân.",
      basePrice: 1950000,
      imageUrl:
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80",
      category: "Giày bóng rổ",
      variants: [
        { size: 40, color: "White", stock: 4 },
        { size: 42, color: "White", stock: 4 },
      ],
    },
    {
      productCode: "SP00008",
      name: "Daily Walk",
      description: "Giày đi bộ thoải mái khi sử dụng hằng ngày.",
      basePrice: 750000,
      imageUrl:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
      category: "Giày thể thao",
      variants: [
        { size: 39, color: "Gray", stock: 9 },
        { size: 40, color: "Gray", stock: 9 },
      ],
    },
    {
      productCode: "SP00009",
      name: "Canvas Street",
      description: "Giày phong cách đường phố trẻ trung.",
      basePrice: 650000,
      imageUrl:
        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
      category: "Giày thời trang",
      variants: [
        { size: 38, color: "Black", stock: 6 },
        { size: 39, color: "Black", stock: 6 },
      ],
    },
    {
      productCode: "SP00010",
      name: "Light Move",
      description: "Giày nhẹ dành cho đi bộ và vận động.",
      basePrice: 1100000,
      imageUrl:
        "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=900&q=80",
      category: "Giày chạy bộ",
      variants: [
        { size: 40, color: "White", stock: 7 },
        { size: 41, color: "Gray", stock: 7 },
      ],
    },
    {
      productCode: "SP00011",
      name: "Active Sport",
      description: "Giày thể thao đa dụng cho sinh hoạt hằng ngày.",
      basePrice: 1350000,
      imageUrl:
        "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=900&q=80",
      category: "Giày thể thao",
      variants: [
        { size: 41, color: "Navy", stock: 5 },
        { size: 42, color: "Navy", stock: 5 },
      ],
    },
    {
      productCode: "SP00012",
      name: "Classic Sneaker",
      description: "Giày sneaker cổ điển, dễ phối đồ.",
      basePrice: 990000,
      imageUrl:
        "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=900&q=80",
      category: "Giày thời trang",
      variants: [
        { size: 39, color: "White", stock: 6 },
        { size: 40, color: "White", stock: 6 },
      ],
    },
  ];

  // 3. Tạo hoặc cập nhật sản phẩm theo productCode.
  for (const sp of sanPhamMau) {
    const categoryId = danhMucTheoTen[sp.category];

    if (!categoryId) {
      throw new Error(`Không tìm thấy danh mục: ${sp.category}`);
    }

    const sanPham = await prisma.product.upsert({
      where: {
        productCode: sp.productCode,
      },

      update: {
        name: sp.name,
        description: sp.description,
        basePrice: sp.basePrice,
        imageUrl: sp.imageUrl,
        categoryId,
        isActive: true,
      },

      create: {
        productCode: sp.productCode,
        name: sp.name,
        description: sp.description,
        basePrice: sp.basePrice,
        imageUrl: sp.imageUrl,
        categoryId,
        isActive: true,
      },
    });

    // 4. Tạo biến thể nếu chưa tồn tại.
    // Không ghi đè stock của biến thể đã có.
    for (const bienThe of sp.variants) {
      await prisma.productVariant.upsert({
        where: {
          productId_size_color: {
            productId: sanPham.id,
            size: bienThe.size,
            color: bienThe.color,
          },
        },

        update: {
          isActive: true,
        },

        create: {
          productId: sanPham.id,
          sku: `${sp.productCode}-V${String(
            sp.variants.indexOf(bienThe) + 1,
          ).padStart(3, "0")}`,
          size: bienThe.size,
          color: bienThe.color,
          stock: bienThe.stock,
          isActive: true,
        },
      });
    }

    console.log(`Đã xử lý sản phẩm: ${sp.productCode} - ${sp.name}`);
  }

  // 5. Tạo các mã khuyến mãi.
  await seedPromotions();

  console.log("----------------------------------");
  console.log(`Đã xử lý ${sanPhamMau.length} sản phẩm.`);
  console.log(`Đã xử lý ${tenDanhMuc.length} danh mục.`);
  console.log("Seed hoàn tất!");
}

// ======================================================
// 3. CHẠY SEED
// ======================================================

main()
  .catch((error) => {
    console.error("Lỗi tạo dữ liệu seed:", error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
