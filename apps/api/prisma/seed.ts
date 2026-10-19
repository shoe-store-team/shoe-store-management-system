
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

  // 2. Dữ liệu 12 sản phẩm và các biến thể size/màu.
  // stock chỉ được sử dụng khi tạo biến thể mới.
  const sanPhamMau = [
    {
      productCode: 'SP00001',
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
      productCode: 'SP00002',
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
      productCode: 'SP00003',
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
      productCode: 'SP00004',
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
      productCode: 'SP00005',
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
      productCode: 'SP00006',
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
      productCode: 'SP00007',
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
      productCode: 'SP00008',
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
      productCode: 'SP00009',
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
      productCode: 'SP00010',
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
      productCode: 'SP00011',
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
      productCode: 'SP00012',
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
            sp.variants.indexOf(bienThe) + 1
          ).padStart(3, '0')}`,
          size: bienThe.size,
          color: bienThe.color,
          stock: bienThe.stock,
          isActive: true,
        },
      });
    }

    console.log(
      `Đã xử lý sản phẩm: ${sp.productCode} - ${sp.name}`
    );
  }

  console.log('----------------------------------');
  console.log(`Đã xử lý ${sanPhamMau.length} sản phẩm.`);
  console.log(`Đã xử lý ${tenDanhMuc.length} danh mục.`);
  console.log('Seed hoàn tất!');
}

main()
  .catch((error) => {
    console.error('Lỗi tạo dữ liệu seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
