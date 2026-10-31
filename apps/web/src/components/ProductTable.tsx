
import type { SanPham } from '../types/product';

type ProductTableProps = {
  sanPhams: SanPham[];
  onSua: (sanPham: SanPham) => void;
  onXoa: (id: string, name: string) => void;
};

const formatPrice = (price: number | string) =>
  `${Number(price).toLocaleString('vi-VN')} đ`;

// Tính giá bán thực tế của từng biến thể.
const layGiaBienThe = (
  sanPham: SanPham,
  priceOverride?: number | string | null
) => Number(priceOverride ?? sanPham.basePrice);

// Hiển thị giá thấp nhất - cao nhất của các biến thể đang hoạt động.
const hienThiKhoangGia = (sanPham: SanPham) => {
  const activeVariants = sanPham.variants.filter(
    (variant) => variant.isActive !== false
  );

  if (activeVariants.length === 0) {
    return formatPrice(sanPham.basePrice);
  }

  const prices = activeVariants.map((variant) =>
    layGiaBienThe(sanPham, variant.priceOverride)
  );

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return formatPrice(minPrice);
  }

  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};

export function ProductTable({
  sanPhams,
  onSua,
  onXoa,
}: ProductTableProps) {
  if (sanPhams.length === 0) {
    return (
      <div className="sl-empty-state">
        <span>◫</span>
        <strong>Chưa tìm thấy sản phẩm</strong>
        <p>Thử thay đổi từ khóa hoặc bộ lọc danh mục.</p>
      </div>
    );
  }

  return (
    <div className="sl-table-wrap">
      <table className="sl-product-table">
        <thead>
          <tr>
            <th>SẢN PHẨM</th>
            <th>DANH MỤC</th>
            <th>BIẾN THỂ</th>
            <th>GIÁ BÁN</th>
            <th>TỒN KHO</th>
            <th>TRẠNG THÁI</th>
            <th>THAO TÁC</th>
          </tr>
        </thead>

        <tbody>
          {sanPhams.map((sanPham) => {
            const totalStock = sanPham.variants.reduce(
              (sum, variant) => sum + variant.stock,
              0
            );

            const activeVariants = sanPham.variants.filter(
              (variant) => variant.isActive !== false
            );

            const inactiveCount =
              sanPham.variants.length - activeVariants.length;

            return (
              <tr key={sanPham.id}>
                <td>
                  <div className="sl-admin-product">
                    {sanPham.imageUrl ? (
                      <img
                        src={sanPham.imageUrl}
                        alt={sanPham.name}
                      />
                    ) : (
                      <div className="sl-product-placeholder">S</div>
                    )}

                    <span>
                      <strong>{sanPham.name}</strong>
                      <small>
                        {sanPham.description || 'Chưa có mô tả'}
                      </small>
                    </span>
                  </div>
                </td>

                <td>
                  {sanPham.category?.name || 'Chưa phân loại'}
                </td>

                <td>
                  <div className="sl-variant-chips">
                    {activeVariants.length > 0 ? (
                      activeVariants.slice(0, 3).map((variant) => (
                        <span key={variant.id}>
                          {variant.color} / {variant.size}
                        </span>
                      ))
                    ) : (
                      <small>Chưa có biến thể hoạt động</small>
                    )}

                    {activeVariants.length > 3 && (
                      <small>+{activeVariants.length - 3}</small>
                    )}
                  </div>

                  <small className="sl-muted">
                    {activeVariants.length} biến thể hoạt động
                    {inactiveCount > 0 && ` · ${inactiveCount} đã ẩn`}
                  </small>
                </td>

                <td className="sl-price-cell">
                  {hienThiKhoangGia(sanPham)}
                </td>

                <td>
                  <strong
                    className={totalStock <= 5 ? 'sl-low-stock' : ''}
                  >
                    {totalStock}
                  </strong>
                  <small className="sl-muted">Tổng số lượng</small>
                </td>

                <td>
                  <span
                    className={`sl-status ${
                      sanPham.isActive === false ? 'is-off' : 'is-on'
                    }`}
                  >
                    <i />
                    {sanPham.isActive === false
  ? 'Ngừng kinh doanh'
  : 'Đang kinh doanh'}
                  </span>
                </td>

                <td>
                  <div className="sl-row-actions">
                    <button
                      type="button"
                      onClick={() => onSua(sanPham)}
                    >
                      Sửa
                    </button>

                    <button
                      type="button"
                      className="sl-delete-button"
                      onClick={() =>
                        onXoa(sanPham.id, sanPham.name)
                      }
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
