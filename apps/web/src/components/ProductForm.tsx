
import { useState, type FormEvent } from 'react';
import type {
  SanPham,
  TaoSanPhamDto,
  CapNhatSanPhamDto,
  BienTheGiayInput,
} from '../types/product';

type DanhMuc = {
  id: string;
  name: string;
};

type BienTheDangNhap = {
  id?: string;
  sku?: string;
  stock?: number;
  isActive?: boolean;
  laBienTheCu: boolean;
  size: string;
  color: string;
  priceOverride: string;
  imageUrl: string;
};

type ProductFormProps = {
  sanPhamDangSua: SanPham | null;
  danhMucs: DanhMuc[];
  dangXuLy: boolean;
  onThem: (data: TaoSanPhamDto) => Promise<void>;
  onCapNhat: (id: string, data: CapNhatSanPhamDto) => Promise<void>;
  onHuySua: () => void;
};

export function ProductForm({
  sanPhamDangSua,
  danhMucs,
  dangXuLy,
  onThem,
  onCapNhat,
  onHuySua,
}: ProductFormProps) {
  const [tenGiay, setTenGiay] = useState(
    sanPhamDangSua?.name ?? ''
  );

  const [moTa, setMoTa] = useState(
    sanPhamDangSua?.description ?? ''
  );

  const [giaBan, setGiaBan] = useState(
    sanPhamDangSua
      ? String(sanPhamDangSua.basePrice)
      : ''
  );

  const [imageUrl, setImageUrl] = useState(
    sanPhamDangSua?.imageUrl ?? ''
  );

  const [categoryId, setCategoryId] = useState(
    sanPhamDangSua?.category?.id ?? ''
  );

  const [isActive, setIsActive] = useState(
    sanPhamDangSua?.isActive ?? true
  );

  const [variants, setVariants] = useState<BienTheDangNhap[]>(
    () => {
      if (sanPhamDangSua) {
        return sanPhamDangSua.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          stock: variant.stock,
          isActive: variant.isActive,
          laBienTheCu: true,
          size: String(variant.size),
          color: variant.color,
          priceOverride:
            variant.priceOverride == null
              ? ''
              : String(variant.priceOverride),
          imageUrl: variant.imageUrl ?? '',
        }));
      }

      return [
        {
          laBienTheCu: false,
          size: '40',
          color: 'Black',
          priceOverride: '',
          imageUrl: '',
        },
      ];
    }
  );

  function themBienThe() {
    setVariants((current) => [
      ...current,
      {
        laBienTheCu: false,
        size: '40',
        color: '',
        priceOverride: '',
        imageUrl: '',
      },
    ]);
  }

  function capNhatBienThe(
    index: number,
    field: 'size' | 'color' | 'priceOverride' | 'imageUrl',
    value: string
  ) {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  }

  function xoaBienThe(index: number) {
    setVariants((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function chuyenThanhBienThe(): BienTheGiayInput[] {
    return variants.map((variant) => ({
      size: Number(variant.size),
      color: variant.color.trim(),
      priceOverride:
        variant.priceOverride.trim() === ''
          ? null
          : Number(variant.priceOverride),
      imageUrl: variant.imageUrl.trim() || null,
    }));
  }

  function capNhatTrangThai() {
    setIsActive((current) => !current);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const dangThemMoi = !sanPhamDangSua;
    const coNhapGia = giaBan.trim() !== '';
    const basePrice = Number(giaBan);

    if (!tenGiay.trim()) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }

    if (dangThemMoi && !coNhapGia) {
      alert('Vui lòng nhập giá bán.');
      return;
    }

    if (
      coNhapGia &&
      (!Number.isFinite(basePrice) || basePrice <= 0)
    ) {
      alert('Giá bán phải lớn hơn 0.');
      return;
    }

    // Kiểm tra size, màu sắc và giá riêng.
    for (const variant of variants) {
      const size = Number(variant.size);

      if (
        !Number.isInteger(size) ||
        size <= 0 ||
        !variant.color.trim()
      ) {
        alert('Vui lòng kiểm tra size và màu sắc của biến thể.');
        return;
      }

      if (variant.priceOverride.trim() !== '') {
        const price = Number(variant.priceOverride);

        if (!Number.isFinite(price) || price <= 0) {
          alert('Giá riêng của biến thể phải lớn hơn 0.');
          return;
        }
      }
    }

    // Kiểm tra trùng size và màu.
    const bienTheGuiLen = chuyenThanhBienThe();

    const khoaBienThe = bienTheGuiLen.map(
      (variant) =>
        `${variant.size}-${variant.color.trim().toLowerCase()}`
    );

    if (new Set(khoaBienThe).size !== khoaBienThe.length) {
      alert('Không được nhập hai biến thể trùng size và màu.');
      return;
    }

    // Dữ liệu chung của sản phẩm.
    const duLieuChung = {
      name: tenGiay.trim(),
      description: moTa.trim(),
      imageUrl: imageUrl.trim() || null,
      categoryId: categoryId || null,
    };

    if (sanPhamDangSua) {
      const data: CapNhatSanPhamDto = {
        ...duLieuChung,
        ...(coNhapGia ? { basePrice } : {}),
        isActive,
        variants: bienTheGuiLen,
      };

      await onCapNhat(sanPhamDangSua.id, data);
      return;
    }

    if (bienTheGuiLen.length === 0) {
      alert('Sản phẩm phải có ít nhất một biến thể.');
      return;
    }

    await onThem({
      ...duLieuChung,
      basePrice,
      variants: bienTheGuiLen,
    });
  }

  return (
    <form className="sl-form-card" onSubmit={handleSubmit}>
      <div className="sl-panel-heading">
        <div>
          <p className="sl-eyebrow">PRODUCT DETAILS</p>

          <h2>
            {sanPhamDangSua
              ? 'Chỉnh sửa sản phẩm'
              : 'Thông tin sản phẩm'}
          </h2>

          <p>Tên, danh mục và thông tin cơ bản của sản phẩm.</p>

          {sanPhamDangSua && (
            <p className="sl-form-note">
              Mã sản phẩm:{' '}
              <strong>{sanPhamDangSua.productCode}</strong>
            </p>
          )}
        </div>

        {sanPhamDangSua && (
          <button
            className="sl-text-button"
            type="button"
            onClick={onHuySua}
            disabled={dangXuLy}
          >
            Đóng ×
          </button>
        )}
      </div>

      <div className="sl-form-grid">
        <label className="sl-field sl-full">
          Tên sản phẩm <span>*</span>
          <input
            value={tenGiay}
            onChange={(e) => setTenGiay(e.target.value)}
            placeholder="Ví dụ: Everyday Mono"
            required
            maxLength={150}
            disabled={dangXuLy}
          />
        </label>

        <label className="sl-field">
          Danh mục
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={dangXuLy}
          >
            <option value="">Chưa phân loại</option>
            {danhMucs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        {sanPhamDangSua && (
          <div className="sl-field">
            <span>Trạng thái kinh doanh</span>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <strong>
                {isActive ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
              </strong>

              <button
                type="button"
                className="sl-button sl-button-light"
                disabled={dangXuLy}
                onClick={capNhatTrangThai}
              >
                {isActive
                  ? 'Ngừng kinh doanh'
                  : 'Mở kinh doanh lại'}
              </button>
            </div>

            <small className="sl-form-note">
              Trạng thái sẽ được lưu khi bạn bấm Lưu thay đổi.
            </small>
          </div>
        )}

        <label className="sl-field">
          Giá bán (VNĐ)
          {!sanPhamDangSua && <span>*</span>}

          <input
            type="number"
            min="1"
            step="any"
            value={giaBan}
            onChange={(e) => setGiaBan(e.target.value)}
            placeholder={
              sanPhamDangSua
                ? 'Để trống nếu không đổi giá'
                : '1.500.000'
            }
            required={!sanPhamDangSua}
            disabled={dangXuLy}
          />

          {sanPhamDangSua && (
            <small className="sl-form-note">
              Giá hiện tại:{' '}
              {sanPhamDangSua.basePrice.toLocaleString('vi-VN')} VNĐ.
              Để trống nếu muốn giữ nguyên giá.
            </small>
          )}
        </label>

        <label className="sl-field sl-full">
          URL hình ảnh chung của sản phẩm
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/images/products/1-do.jpg"
            disabled={dangXuLy}
          />
        </label>

        {imageUrl.trim() && (
          <div className="sl-full">
            <img
              src={imageUrl}
              alt="Xem trước sản phẩm"
              style={{
                width: '140px',
                height: '140px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              onLoad={(e) => {
                e.currentTarget.style.display = 'block';
              }}
            />
          </div>
        )}

        <label className="sl-field sl-full">
          Mô tả
          <textarea
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder="Mô tả chất liệu, kiểu dáng và đặc điểm sản phẩm..."
            rows={4}
            disabled={dangXuLy}
          />
        </label>

        <div className="sl-form-divider sl-full">
          <strong>Biến thể sản phẩm</strong>
          <small>
            Mỗi màu có thể sử dụng một ảnh riêng. Các size cùng màu
            dùng chung ảnh. Biến thể cũ giữ nguyên SKU và tồn kho.
          </small>
        </div>

        {variants.map((variant, index) => (
          <div
            key={variant.id ?? `new-${index}`}
            className="sl-full sl-variant-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.5fr 1fr auto',
              gap: '12px',
              alignItems: 'end',
              marginTop: '12px',
            }}
          >
            <label className="sl-field">
              Size EU <span>*</span>
              <input
                type="number"
                min="1"
                step="1"
                value={variant.size}
                onChange={(e) =>
                  capNhatBienThe(index, 'size', e.target.value)
                }
                required
                disabled={dangXuLy || variant.laBienTheCu}
              />
            </label>

            <label className="sl-field">
              Màu sắc <span>*</span>
              <input
                value={variant.color}
                onChange={(e) =>
                  capNhatBienThe(index, 'color', e.target.value)
                }
                placeholder="Black, White..."
                required
                disabled={dangXuLy || variant.laBienTheCu}
              />
            </label>

            <label className="sl-field">
              Ảnh của biến thể
              <input
                type="text"
                value={variant.imageUrl}
                onChange={(e) =>
                  capNhatBienThe(index, 'imageUrl', e.target.value)
                }
                placeholder="/images/products/1-do.jpg"
                disabled={dangXuLy}
              />
            </label>

            <label className="sl-field">
              Giá riêng (VNĐ)
              <input
                type="number"
                min="1"
                step="1000"
                value={variant.priceOverride}
                onChange={(e) =>
                  capNhatBienThe(index, 'priceOverride', e.target.value)
                }
                placeholder="Dùng giá chung"
                disabled={dangXuLy}
              />
            </label>

            {variant.laBienTheCu ? (
              <div className="sl-form-note">
                <strong>{variant.sku}</strong>
                <small>
                  Tồn kho: {variant.stock}
                  {variant.isActive === false
                    ? ' · Đã ẩn'
                    : ' · Đang hoạt động'}
                </small>
              </div>
            ) : (
              <button
                className="sl-button sl-button-light"
                type="button"
                onClick={() => xoaBienThe(index)}
                disabled={dangXuLy}
              >
                Xóa
              </button>
            )}

            {variant.imageUrl.trim() && (
              <div className="sl-full">
                <img
                  src={variant.imageUrl}
                  alt={`Ảnh biến thể ${variant.color}`}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = 'block';
                  }}
                />
              </div>
            )}
          </div>
        ))}

        <div className="sl-full">
          <button
            className="sl-button sl-button-light"
            type="button"
            onClick={themBienThe}
            disabled={dangXuLy}
          >
            ＋ Thêm size / màu
          </button>
        </div>

        <div className="sl-form-note sl-full">
          SKU của biến thể mới sẽ được hệ thống tự động tạo sau khi
          lưu sản phẩm.
        </div>

        <div className="sl-form-note sl-full">
          Tồn kho biến thể mới mặc định bằng 0. Việc nhập và điều
          chỉnh tồn kho thực hiện trong phân hệ Kho.
        </div>
      </div>

      <div className="sl-form-actions">
        {sanPhamDangSua && (
          <button
            className="sl-button sl-button-light"
            type="button"
            onClick={onHuySua}
            disabled={dangXuLy}
          >
            Hủy
          </button>
        )}

        <button
          className="sl-button sl-button-dark"
          type="submit"
          disabled={dangXuLy}
        >
          {dangXuLy
            ? 'Đang lưu...'
            : sanPhamDangSua
              ? 'Lưu thay đổi'
              : '＋ Thêm sản phẩm'}
        </button>
      </div>
    </form>
  );
}
