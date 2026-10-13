
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Tạo danh mục giày nếu chưa tồn tại
  const theThao = await prisma.category.upsert({
    where: { name: 'Giày thể thao' },
    update: {},
    create: { name: 'Giày thể thao' }
  });

  const chayBo = await prisma.category.upsert({
    where: { name: 'Giày chạy bộ' },
    update: {},
    create: { name: 'Giày chạy bộ' }
  });

  // 2. Tạo sản phẩm mẫu nếu chưa tồn tại
  const sanPhamMau = [
    {
      name: 'Nike Air Demo',
      description: 'Giày thể thao mẫu dành cho đồ án',
      basePrice: 1500000,
      categoryId: theThao.id,
      size: 40,
      color: 'Black',
      stock: 10
    },
    {
      name: 'Adidas Run Demo',
      description: 'Giày chạy bộ mẫu dành cho đồ án',
      basePrice: 1800000,
      categoryId: chayBo.id,
      size: 41,
      color: 'White',
      stock: 8
    }
  ];

  for (const sp of sanPhamMau) {
    const daTonTai = await prisma.product.findFirst({
      where: { name: sp.name }
    });

    if (!daTonTai) {
      await prisma.product.create({
        data: {
          name: sp.name,
          description: sp.description,
          basePrice: sp.basePrice,
          categoryId: sp.categoryId,
          variants: {
            create: {
              size: sp.size,
              color: sp.color,
              stock: sp.stock
            }
          }
        }
      });

      console.log(`Đã tạo sản phẩm: ${sp.name}`);
    } else {
      console.log(`Sản phẩm đã tồn tại: ${sp.name}`);
    }
  }

  console.log('Hoàn tất tạo dữ liệu mẫu!');
}


main()
  .catch((error) => {
    console.error('Lỗi tạo dữ liệu mẫu:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

