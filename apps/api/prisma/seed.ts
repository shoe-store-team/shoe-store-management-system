
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Tạo danh mục nếu chưa tồn tại.
  const tenDanhMuc = [
    'Giày thể thao',
    'Giày chạy bộ',
    'Giày bóng rổ',
    'Giày thời trang',
  ];

  const danhMucTheoTen: Record<string, string> = {};

  for (const ten of tenDanhMuc) {
    const danhMuc = await prisma.category.upsert({
      where: { name: ten },
      update: {},
      create: { name: ten },
    });

    danhMucTheoTen[ten] = danhMuc.id;
  }

  // 2. Khai báo dữ liệu sản phẩm và các biến thể size/màu.
  // imageUrl là URL ảnh lưu trong database, không phải file ảnh cục bộ.
  const sanPhamMau = [
    {
      name: 'Nike Air Demo',
      description: 'Giày thể thao phong cách năng động.',
      basePrice: 1500000,
      imageUrl:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thể thao',
      variants: [
        { size: 40, color: 'Red', stock: 10 },
        { size: 41, color: 'Red', stock: 8 },
        { size: 42, color: 'Black', stock: 6 },
      ],
    },
    {
      name: 'Adidas Run Demo',
      description: 'Giày chạy bộ nhẹ, phù hợp vận động hằng ngày.',
      basePrice: 1800000,
      imageUrl:
        'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
      category: 'Giày chạy bộ',
      variants: [
        { size: 40, color: 'White', stock: 8 },
        { size: 41, color: 'White', stock: 8 },
        { size: 42, color: 'Black', stock: 5 },
      ],
    },
    {
      name: 'Street Runner',
      description: 'Giày thể thao phù hợp đi học và đi chơi.',
      basePrice: 950000,
      imageUrl:
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thể thao',
      variants: [
        { size: 39, color: 'White', stock: 7 },
        { size: 40, color: 'White', stock: 7 },
      ],
    },
    {
      name: 'Urban Classic',
      description: 'Giày thời trang kiểu dáng đơn giản.',
      basePrice: 890000,
      imageUrl:
        'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thời trang',
      variants: [
        { size: 39, color: 'Black', stock: 5 },
        { size: 40, color: 'Black', stock: 5 },
      ],
    },
    {
      name: 'Speed Runner',
      description: 'Giày chạy bộ dành cho các buổi tập luyện.',
      basePrice: 1250000,
      imageUrl:
        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80',
      category: 'Giày chạy bộ',
      variants: [
        { size: 40, color: 'Blue', stock: 8 },
        { size: 41, color: 'Blue', stock: 6 },
      ],
    },
    {
      name: 'Court Pro',
      description: 'Giày bóng rổ cổ cao phong cách thể thao.',
      basePrice: 2100000,
      imageUrl:
        'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=900&q=80',
      category: 'Giày bóng rổ',
      variants: [
        { size: 41, color: 'Black', stock: 5 },
        { size: 42, color: 'Black', stock: 5 },
      ],
    },
    {
      name: 'Hoop Flex',
      description: 'Giày bóng rổ dành cho hoạt động trong sân.',
      basePrice: 1950000,
      imageUrl:
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80',
      category: 'Giày bóng rổ',
      variants: [
        { size: 40, color: 'White', stock: 4 },
        { size: 42, color: 'White', stock: 4 },
      ],
    },
    {
      name: 'Daily Walk',
      description: 'Giày đi bộ thoải mái khi sử dụng hằng ngày.',
      basePrice: 750000,
      imageUrl:
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thể thao',
      variants: [
        { size: 39, color: 'Gray', stock: 9 },
        { size: 40, color: 'Gray', stock: 9 },
      ],
    },
    {
      name: 'Canvas Street',
      description: 'Giày phong cách đường phố trẻ trung.',
      basePrice: 650000,
      imageUrl:
        'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thời trang',
      variants: [
        { size: 38, color: 'Black', stock: 6 },
        { size: 39, color: 'Black', stock: 6 },
      ],
    },
    {
      name: 'Light Move',
      description: 'Giày nhẹ dành cho đi bộ và vận động.',
      basePrice: 1100000,
      imageUrl:
        'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=900&q=80',
      category: 'Giày chạy bộ',
      variants: [
        { size: 40, color: 'White', stock: 7 },
        { size: 41, color: 'Gray', stock: 7 },
      ],
    },
    {
      name: 'Active Sport',
      description: 'Giày thể thao đa dụng cho sinh hoạt hằng ngày.',
      basePrice: 1350000,
      imageUrl:
        'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thể thao',
      variants: [
        { size: 41, color: 'Navy', stock: 5 },
        { size: 42, color: 'Navy', stock: 5 },
      ],
    },
    {
      name: 'Classic Sneaker',
      description: 'Giày sneaker cổ điển, dễ phối đồ.',
      basePrice: 990000,
      imageUrl:
        'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=900&q=80',
      category: 'Giày thời trang',
      variants: [
        { size: 39, color: 'White', stock: 6 },
        { size: 40, color: 'White', stock: 6 },
      ],
    },
  ];

  // 3. Tạo hoặc cập nhật từng sản phẩm.
  for (const sp of sanPhamMau) {
    const categoryId = danhMucTheoTen[sp.category];

    if (!categoryId) {
      throw new Error(`Không tìm thấy danh mục: ${sp.category}`);
    }

    // Product không có unique constraint trên name,
    // nên dùng findFirst để tìm sản phẩm theo tên.
    const sanPhamCu = await prisma.product.findFirst({
      where: { name: sp.name },
      select: { id: true },
    });

    const sanPham = sanPhamCu
      ? await prisma.product.update({
          where: { id: sanPhamCu.id },
          data: {
            description: sp.description,
            basePrice: sp.basePrice,
            imageUrl: sp.imageUrl,
            categoryId,
            isActive: true,
          },
        })
      : await prisma.product.create({
          data: {
            name: sp.name,
            description: sp.description,
            basePrice: sp.basePrice,
            imageUrl: sp.imageUrl,
            categoryId,
            isActive: true,
          },
        });

    // 4. Tạo biến thể nếu chưa có.
    // Nếu biến thể đã có, không ghi đè số lượng tồn kho.
    for (const bienThe of sp.variants) {
      await prisma.productVariant.upsert({
        where: {
          productId_size_color: {
            productId: sanPham.id,
            size: bienThe.size,
            color: bienThe.color,
          },
        },
        update: {},
        create: {
          productId: sanPham.id,
          size: bienThe.size,
          color: bienThe.color,
          stock: bienThe.stock,
          isActive: true,
        },
      });
    }

    console.log(
      `${sanPhamCu ? 'Đã cập nhật' : 'Đã tạo'} sản phẩm: ${sp.name}`,
    );
  }

  console.log(
    `Hoàn tất! Đã xử lý ${sanPhamMau.length} sản phẩm và ${tenDanhMuc.length} danh mục.`,
  );
}

main()
  .catch((error) => {
    console.error('Lỗi tạo dữ liệu seed:', error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

