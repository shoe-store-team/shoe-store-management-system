
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

// GET: Lấy toàn bộ sản phẩm cho trang quản trị.
export async function layTatCaSanPham() {
  return prisma.product.findMany({
    include: {
      category: true,
      variants: true
    }
  });
}

// GET: Lấy chi tiết một sản phẩm.
export async function laySanPhamTheoId(id: string) {
  const sanPham = await prisma.product.findUnique({
    where: { id },
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
    // 1. Tìm số thứ tự sản phẩm tiếp theo.
    const soThuTu = await laySoThuTuSanPhamTiepTheo(tx);

    // 2. Tự sinh mã sản phẩm.
    const productCode = taoMaSanPham(soThuTu);

    // 3. Tạo sản phẩm và tự sinh SKU cho từng biến thể.
    return tx.product.create({
      data: {
        productCode,
        name: data.name.trim(),
        description: data.description ?? null,
        basePrice: data.basePrice,
        imageUrl: data.imageUrl ?? null,
        categoryId: data.categoryId ?? null,
        isActive: true,

        variants: {
          create: data.variants.map((variant, index) => ({
            sku: taoSku(productCode, index + 1),
            size: variant.size,
            color: variant.color.trim(),
            priceOverride: variant.priceOverride ?? null,

            // Tồn kho do Inventory quản lý.
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

// PUT: Cập nhật thông tin và thêm/cập nhật biến thể.
export async function capNhatSanPham(
  id: string,
  data: CapNhatSanPhamInput
) {
  const sanPhamHienTai = await prisma.product.findUnique({
    where: { id }
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

  // Kiểm tra trạng thái kinh doanh.
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
    // Trạng thái biến thể sẽ đồng bộ với trạng thái sản phẩm.
    // Nếu không gửi isActive thì giữ trạng thái hiện tại.
    const trangThaiKinhDoanh =
      data.isActive ?? sanPhamHienTai.isActive;

    // 1. Cập nhật thông tin chính của sản phẩm.
    await tx.product.update({
      where: { id },
      data: duLieuCapNhat
    });

    // 2. Đồng bộ trạng thái của các biến thể hiện tại.
    if (data.isActive !== undefined) {
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: {
          isActive: data.isActive
        }
      });
    }

    // 3. Nếu có gửi variants, thêm mới hoặc cập nhật từng biến thể.
    if (data.variants !== undefined) {
      // Lấy SKU lớn nhất hiện tại để cấp số tiếp theo.
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

        // Kiểm tra biến thể đã tồn tại chưa.
        const bienTheHienTai =
          await tx.productVariant.findUnique({
            where: khoaBienThe
          });

        // Chỉ cấp SKU mới nếu đây là biến thể mới.
        let skuMoi: string | undefined;

        if (!bienTheHienTai) {
          soThuTuSku++;

          skuMoi = taoSku(
            sanPhamHienTai.productCode,
            soThuTuSku
          );
        }

        await tx.productVariant.upsert({
          where: khoaBienThe,

          create: {
            productId: id,
            sku: skuMoi!,
            size: variant.size,
            color,
            priceOverride: variant.priceOverride ?? null,

            // Tồn kho do Inventory quản lý.
            stock: 0,

            // Biến thể mới theo trạng thái sản phẩm.
            isActive: trangThaiKinhDoanh
          },

          update: {
            // Giữ nguyên SKU và stock của biến thể cũ.
            ...(variant.priceOverride !== undefined
              ? { priceOverride: variant.priceOverride }
              : {}),

            // Đồng bộ trạng thái với sản phẩm.
            isActive: trangThaiKinhDoanh
          }
        });
      }
    }

    // 4. Trả về sản phẩm sau khi cập nhật.
    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        variants: true
      }
    });
  });
}


// DELETE: Ngừng kinh doanh sản phẩm, không xóa vật lý.
export async function xoaSanPham(id: string) {
  const sanPham = await prisma.product.findUnique({
    where: { id }
  });

  if (!sanPham) {
    throw new ProductServiceError(
      'Không tìm thấy sản phẩm.',
      404
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { isActive: false }
    });

    await tx.productVariant.updateMany({
      where: { productId: id },
      data: { isActive: false }
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
