
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

type BienTheInput = {
  size: number;
  color: string;
  priceOverride?: number | null;
};

type TaoSanPhamInput = {
  name: string;
  description?: string | null;
  basePrice: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  variants: BienTheInput[];
};

type CapNhatSanPhamInput = {
  name?: string;
  description?: string | null;
  basePrice?: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
  variants?: BienTheInput[];
};

// Lỗi nghiệp vụ có kèm HTTP status code.
export class ProductServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ProductServiceError';
    this.statusCode = statusCode;
  }
}

// Chạy transaction và thử lại nếu có xung đột ghi đồng thời.
async function thucHienTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const soLanThuToiDa = 3;

  for (let lanThu = 1; lanThu <= soLanThuToiDa; lanThu++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      const maLoi = (error as { code?: string }).code;

      const coTheThuLai =
        maLoi === 'P2034' || maLoi === 'P2002';

      if (!coTheThuLai || lanThu === soLanThuToiDa) {
        throw error;
      }
    }
  }

  throw new Error('Không thể hoàn thành transaction.');
}

// Tìm số thứ tự productCode lớn nhất hiện có.
async function laySoThuTuSanPhamTiepTheo(
  tx: Prisma.TransactionClient
): Promise<number> {
  const sanPhams = await tx.product.findMany({
    select: {
      productCode: true
    }
  });

  let soLonNhat = 0;

  for (const sanPham of sanPhams) {
    const ketQua = /^SP(\d+)$/.exec(sanPham.productCode);

    if (ketQua) {
      soLonNhat = Math.max(
        soLonNhat,
        Number(ketQua[1])
      );
    }
  }

  return soLonNhat + 1;
}

// Tạo productCode theo định dạng SP00001.
function taoMaSanPham(soThuTu: number): string {
  return `SP${String(soThuTu).padStart(5, '0')}`;
}

// Tìm số thứ tự SKU lớn nhất của một sản phẩm.
async function laySoThuTuSkuLonNhat(
  tx: Prisma.TransactionClient,
  productId: string,
  productCode: string
): Promise<number> {
  const variants = await tx.productVariant.findMany({
    where: {
      productId
    },
    select: {
      sku: true
    }
  });

  let soLonNhat = 0;
  const tienTo = `${productCode}-V`;

  for (const variant of variants) {
    if (!variant.sku.startsWith(tienTo)) {
      continue;
    }

    const hauTo = variant.sku.slice(tienTo.length);

    if (/^\d+$/.test(hauTo)) {
      soLonNhat = Math.max(
        soLonNhat,
        Number(hauTo)
      );
    }
  }

  return soLonNhat;
}

// Tạo SKU theo định dạng SP00001-V001.
function taoSku(
  productCode: string,
  soThuTu: number
): string {
  return `${productCode}-V${String(soThuTu).padStart(3, '0')}`;
}

// Kiểm tra dữ liệu biến thể.
function kiemTraBienThe(variants: BienTheInput[]) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new ProductServiceError(
      'Sản phẩm phải có ít nhất một biến thể.'
    );
  }

  const daGap = new Set<string>();

  for (const variant of variants) {
    if (
      !Number.isInteger(variant.size) ||
      variant.size <= 0
    ) {
      throw new ProductServiceError('Size giày không hợp lệ.');
    }

    if (
      typeof variant.color !== 'string' ||
      variant.color.trim() === ''
    ) {
      throw new ProductServiceError('Màu sắc không hợp lệ.');
    }

    if (
      variant.priceOverride !== undefined &&
      variant.priceOverride !== null &&
      (
        typeof variant.priceOverride !== 'number' ||
        !Number.isFinite(variant.priceOverride) ||
        variant.priceOverride <= 0
      )
    ) {
      throw new ProductServiceError(
        'Giá riêng của biến thể không hợp lệ.'
      );
    }

    const khoa =
      `${variant.size}-${variant.color.trim().toLowerCase()}`;

    if (daGap.has(khoa)) {
      throw new ProductServiceError(
        `Bị trùng biến thể size ${variant.size}, màu ${variant.color}.`
      );
    }

    daGap.add(khoa);
  }
}

// Kiểm tra danh mục có tồn tại không.
async function kiemTraDanhMuc(categoryId?: string | null) {
  if (categoryId === undefined || categoryId === null) {
    return;
  }

  if (
    typeof categoryId !== 'string' ||
    categoryId.trim() === ''
  ) {
    throw new ProductServiceError('ID danh mục không hợp lệ.');
  }

  const danhMuc = await prisma.category.findUnique({
    where: { id: categoryId }
  });

  if (!danhMuc) {
    throw new ProductServiceError(
      'Danh mục không tồn tại.',
      404
    );
  }
}

// GET: Lấy sản phẩm chưa bị xóa.
// Bao gồm sản phẩm đang kinh doanh và ngừng kinh doanh.
export async function layTatCaSanPham() {
  return prisma.product.findMany({
    where: {
      isDeleted: false
    },
    include: {
      category: true,
      variants: true
    }
  });
}

// GET: Lấy chi tiết sản phẩm chưa bị xóa.
export async function laySanPhamTheoId(id: string) {
  const sanPham = await prisma.product.findFirst({
    where: {
      id,
      isDeleted: false
    },
    include: {
      category: true,
      variants: true
    }
  });

  if (!sanPham) {
    throw new ProductServiceError(
      'Không tìm thấy sản phẩm.',
      404
    );
  }

  return sanPham;
}

// POST: Tạo sản phẩm cùng nhiều biến thể.
export async function taoSanPham(data: TaoSanPhamInput) {
  if (
    typeof data.name !== 'string' ||
    data.name.trim() === ''
  ) {
    throw new ProductServiceError(
      'Tên sản phẩm không được để trống.'
    );
  }

  if (
    typeof data.basePrice !== 'number' ||
    !Number.isFinite(data.basePrice) ||
    data.basePrice <= 0
  ) {
    throw new ProductServiceError(
      'Giá sản phẩm không hợp lệ.'
    );
  }

  if (
    data.description !== undefined &&
    data.description !== null &&
    typeof data.description !== 'string'
  ) {
    throw new ProductServiceError(
      'Mô tả sản phẩm không hợp lệ.'
    );
  }

  if (
    data.imageUrl !== undefined &&
    data.imageUrl !== null &&
    typeof data.imageUrl !== 'string'
  ) {
    throw new ProductServiceError(
      'Đường dẫn hình ảnh không hợp lệ.'
    );
  }

  kiemTraBienThe(data.variants);
  await kiemTraDanhMuc(data.categoryId);

  return thucHienTransaction(async (tx) => {
    const soThuTu = await laySoThuTuSanPhamTiepTheo(tx);
    const productCode = taoMaSanPham(soThuTu);

    return tx.product.create({
      data: {
        productCode,
        name: data.name.trim(),
        description: data.description ?? null,
        basePrice: data.basePrice,
        imageUrl: data.imageUrl ?? null,
        categoryId: data.categoryId ?? null,
        isActive: true,
        isDeleted: false,

        variants: {
          create: data.variants.map((variant, index) => ({
            sku: taoSku(productCode, index + 1),
            size: variant.size,
            color: variant.color.trim(),
            priceOverride: variant.priceOverride ?? null,
            stock: 0,
            isActive: true
          }))
        }
      },
      include: {
        category: true,
        variants: true
      }
    });
  });
}

// PUT: Cập nhật thông tin và thêm/cập nhật biến thể.
export async function capNhatSanPham(
  id: string,
  data: CapNhatSanPhamInput
) {
  // Không cho cập nhật sản phẩm đã xóa.
  const sanPhamHienTai = await prisma.product.findFirst({
    where: {
      id,
      isDeleted: false
    }
  });

  if (!sanPhamHienTai) {
    throw new ProductServiceError(
      'Không tìm thấy sản phẩm.',
      404
    );
  }

  const duLieuCapNhat: {
    name?: string;
    description?: string | null;
    basePrice?: number;
    imageUrl?: string | null;
    categoryId?: string | null;
    isActive?: boolean;
  } = {};

  if (data.name !== undefined) {
    if (
      typeof data.name !== 'string' ||
      data.name.trim() === ''
    ) {
      throw new ProductServiceError(
        'Tên sản phẩm không hợp lệ.'
      );
    }

    duLieuCapNhat.name = data.name.trim();
  }

  if (data.description !== undefined) {
    if (
      data.description !== null &&
      typeof data.description !== 'string'
    ) {
      throw new ProductServiceError(
        'Mô tả sản phẩm không hợp lệ.'
      );
    }

    duLieuCapNhat.description = data.description;
  }

  if (data.basePrice !== undefined) {
    if (
      typeof data.basePrice !== 'number' ||
      !Number.isFinite(data.basePrice) ||
      data.basePrice <= 0
    ) {
      throw new ProductServiceError(
        'Giá sản phẩm không hợp lệ.'
      );
    }

    duLieuCapNhat.basePrice = data.basePrice;
  }

  if (data.imageUrl !== undefined) {
    if (
      data.imageUrl !== null &&
      typeof data.imageUrl !== 'string'
    ) {
      throw new ProductServiceError(
        'Đường dẫn hình ảnh không hợp lệ.'
      );
    }

    duLieuCapNhat.imageUrl = data.imageUrl;
  }

  if (data.categoryId !== undefined) {
    await kiemTraDanhMuc(data.categoryId);
    duLieuCapNhat.categoryId = data.categoryId;
  }

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== 'boolean') {
      throw new ProductServiceError(
        'Trạng thái kinh doanh không hợp lệ.'
      );
    }

    duLieuCapNhat.isActive = data.isActive;
  }

  if (data.variants !== undefined) {
    kiemTraBienThe(data.variants);
  }

  return thucHienTransaction(async (tx) => {
    const trangThaiKinhDoanh =
      data.isActive ?? sanPhamHienTai.isActive;

    await tx.product.update({
      where: { id },
      data: duLieuCapNhat
    });

    // Đồng bộ trạng thái biến thể khi bật/tắt kinh doanh.
    if (data.isActive !== undefined) {
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: {
          isActive: data.isActive
        }
      });
    }

    if (data.variants !== undefined) {
      let soThuTuSku = await laySoThuTuSkuLonNhat(
        tx,
        id,
        sanPhamHienTai.productCode
      );

      for (const variant of data.variants) {
        const color = variant.color.trim();

        const khoaBienThe = {
          productId_size_color: {
            productId: id,
            size: variant.size,
            color
          }
        };

        const bienTheHienTai =
          await tx.productVariant.findUnique({
            where: khoaBienThe
          });

        if (bienTheHienTai) {
          // Biến thể cũ: chỉ cập nhật giá riêng.
          // Không thay đổi SKU, tồn kho hoặc trạng thái.
          await tx.productVariant.update({
            where: {
              id: bienTheHienTai.id
            },
            data: {
              ...(variant.priceOverride !== undefined
                ? { priceOverride: variant.priceOverride }
                : {})
            }
          });
        } else {
          // Biến thể mới: cấp SKU mới.
          soThuTuSku++;

          const skuMoi = taoSku(
            sanPhamHienTai.productCode,
            soThuTuSku
          );

          await tx.productVariant.create({
            data: {
              productId: id,
              sku: skuMoi,
              size: variant.size,
              color,
              priceOverride: variant.priceOverride ?? null,
              stock: 0,
              isActive: trangThaiKinhDoanh
            }
          });
        }
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        variants: true
      }
    });
  });
}

// DELETE: Xóa mềm sản phẩm, không xóa vật lý dữ liệu.
export async function xoaSanPham(id: string) {
  return prisma.$transaction(async (tx) => {
    const sanPham = await tx.product.findFirst({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!sanPham) {
      throw new ProductServiceError(
        'Không tìm thấy sản phẩm hoặc sản phẩm đã được xóa.',
        404
      );
    }

    // Đánh dấu sản phẩm đã xóa và ngừng kinh doanh.
    await tx.product.update({
      where: { id },
      data: {
        isActive: false,
        isDeleted: true
      }
    });

    // Ngừng tất cả biến thể của sản phẩm.
    await tx.productVariant.updateMany({
      where: {
        productId: id
      },
      data: {
        isActive: false
      }
    });

    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        variants: true
      }
    });
  });
}
