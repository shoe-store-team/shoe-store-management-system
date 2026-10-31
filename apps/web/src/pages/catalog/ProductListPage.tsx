
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';
import type { SanPham } from '../../types/product';

const formatPrice = (price: number | string) =>
  `${Number(price).toLocaleString('vi-VN')} đ`;

// Lấy giá thấp nhất và cao nhất của các biến thể đang hoạt động.
const layKhoangGia = (sp: SanPham) => {
  const variants = sp.variants.filter(
    (variant) => variant.isActive !== false
  );

  if (variants.length === 0) {
    return 'Hết hàng';
  }

  const prices = variants.map((variant) =>
    Number(variant.priceOverride ?? sp.basePrice)
  );

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return formatPrice(min);
  }

  return `${formatPrice(min)} - ${formatPrice(max)}`;
};

export function ProductListPage() {
  const [sanPhams, setSanPhams] = useState<SanPham[]>([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [danhMuc, setDanhMuc] = useState('Tất cả');
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');

  // Tải lại danh sách sản phẩm khi người dùng nhấn nút.
  const taiSanPham = useCallback(async () => {
    setDangTai(true);
    setLoi('');

    try {
      const data = await productService.layTatCa();
      setSanPhams(data);
    } catch (error) {
      setLoi(
        error instanceof Error
          ? error.message
          : 'Không thể tải sản phẩm.'
      );
    } finally {
      setDangTai(false);
    }
  }, []);

  // Tải sản phẩm khi mở trang.
  useEffect(() => {
    let daHuy = false;

    productService
      .layTatCa()
      .then((data) => {
        if (!daHuy) {
          setSanPhams(data);
        }
      })
      .catch((error: unknown) => {
        if (!daHuy) {
          setLoi(
            error instanceof Error
              ? error.message
              : 'Không thể tải sản phẩm.'
          );
        }
      })
      .finally(() => {
        if (!daHuy) {
          setDangTai(false);
        }
      });

    return () => {
      daHuy = true;
    };
  }, []);

  // Chỉ lấy danh mục có sản phẩm đang kinh doanh.
  const danhMucs = useMemo(() => {
    const categories = sanPhams
      .filter(
        (sp) =>
          sp.isActive !== false &&
          sp.variants.some((v) => v.isActive !== false)
      )
      .map((sp) => sp.category?.name)
      .filter((name): name is string => Boolean(name));

    return ['Tất cả', ...new Set(categories)];
  }, [sanPhams]);

  // Lọc sản phẩm theo từ khóa và danh mục.
  const sanPhamHienThi = useMemo(() => {
    return sanPhams.filter((sp) => {
      // Không hiển thị sản phẩm đã ẩn.
      if (sp.isActive === false) return false;

      // Không hiển thị sản phẩm không có biến thể hoạt động.
      const coBienTheHoatDong = sp.variants.some(
        (variant) => variant.isActive !== false
      );

      if (!coBienTheHoatDong) return false;

      const keyword = tuKhoa.trim().toLocaleLowerCase('vi');

      const matchText =
        !keyword ||
        sp.name.toLocaleLowerCase('vi').includes(keyword) ||
        (sp.description ?? '')
          .toLocaleLowerCase('vi')
          .includes(keyword);

      const matchCategory =
        danhMuc === 'Tất cả' ||
        sp.category?.name === danhMuc;

      return matchText && matchCategory;
    });
  }, [sanPhams, tuKhoa, danhMuc]);

  return (
    <div className="sl-store">
      {/* Thông báo đầu trang */}
      <div className="sl-announcement">
        BỘ SƯU TẬP MỚI ĐÃ CÓ MẶT
        <span>Khám phá ngay →</span>
      </div>

      {/* Header cửa hàng */}
      <header className="sl-store-header">

        {/* Tầng trên: Logo, tìm kiếm, tài khoản, giỏ hàng */}
        <div className="sl-store-header-top">
          <Link to="/" className="sl-store-logo">
            <span>S</span> Shoe Store
          </Link>

          <label className="sl-store-search">
            ⌕
            <input
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              placeholder="Tìm giày..."
            />
          </label>

          <div className="sl-store-actions">
            <Link to="/cart" className="sl-cart-link">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 8H6" />
    <circle cx="10" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
  </svg>
  <span>Giỏ hàng</span>
</Link>
            <Link to="/login">Tài khoản</Link>
          </div>
        </div>

        {/* Tầng dưới: Danh mục */}
        <nav className="sl-store-nav">
          <a href="#collection" className="active">
            Cửa hàng
          </a>
          <a href="#collection">Bộ sưu tập</a>
          <a href="#story">Về Shoe Store</a>
        </nav>
      </header>

      <main className="sl-store-main">

        {/* Banner chính */}
        <section className="sl-hero">
          <div className="sl-hero-copy">
            <p className="sl-hero-kicker">
              Shoe Store DAY · EVERYDAY COLLECTION
            </p>

            <h1>
              Chuyển động
              <br />
              theo cách của bạn.
            </h1>

            <p>
              Thiết kế tối giản, thoải mái trong từng bước chân.
              <br />
              Tìm đôi giày đồng hành cùng nhịp sống mỗi ngày.
            </p>

            <a href="#collection" className="sl-hero-button">
              Khám phá bộ sưu tập <span>↗</span>
            </a>
          </div>

          <div className="sl-hero-note">
            <span>01</span> / EVERYDAY ESSENTIALS
          </div>
        </section>

        {/* Lợi ích cửa hàng */}
        <section className="sl-benefits">
          <div>
            <span>◇</span>
            <p>
              <strong>Chất lượng chọn lọc</strong>
              <small>Chú trọng từng chi tiết</small>
            </p>
          </div>

          <div>
            <span>↗</span>
            <p>
              <strong>Giao hàng toàn quốc</strong>
              <small>Theo dõi đơn hàng dễ dàng</small>
            </p>
          </div>

          <div>
            <span>↺</span>
            <p>
              <strong>Đổi trả linh hoạt</strong>
              <small>Hỗ trợ theo chính sách cửa hàng</small>
            </p>
          </div>
        </section>

        {/* Danh sách sản phẩm */}
        <section className="sl-collection" id="collection">
          <div className="sl-collection-heading">
            <div>
              <p className="sl-eyebrow">THE COLLECTION</p>
              <h2>Chọn phong cách của bạn</h2>
              <p>Những thiết kế dành cho mọi hành trình.</p>
            </div>

            <span>{sanPhamHienThi.length} sản phẩm</span>
          </div>

          {/* Bộ lọc danh mục */}
          <div className="sl-category-tabs">
            {danhMucs.map((item) => (
              <button
                key={item}
                className={danhMuc === item ? 'selected' : ''}
                onClick={() => setDanhMuc(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Trạng thái tải, lỗi hoặc danh sách sản phẩm */}
          {dangTai ? (
            <div className="sl-store-message">
              Đang tải bộ sưu tập...
            </div>
          ) : loi ? (
            <div className="sl-store-message sl-store-error">
              <p>{loi}</p>
              <button type="button" onClick={taiSanPham}>
                Thử tải lại
              </button>
            </div>
          ) : sanPhamHienThi.length === 0 ? (
            <div className="sl-store-message">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          ) : (
            <div className="sl-store-grid">
              {sanPhamHienThi.map((sp, index) => {
                const activeVariants = sp.variants.filter(
                  (variant) => variant.isActive !== false
                );

                return (
                  <Link
                    to={`/products/${sp.id}`}
                    className="sl-store-product"
                    key={sp.id}
                  >
                    <div className="sl-store-product-image">
                      {sp.imageUrl ? (
                        <img
                          src={sp.imageUrl}
                          alt={sp.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="sl-store-image-placeholder">
                          Shoe Store DAY
                        </div>
                      )}

                      {index === 0 && (
                        <span className="sl-product-tag">
                          Nổi bật
                        </span>
                      )}

                      <div className="sl-store-image-overlay">
                        Xem chi tiết sản phẩm
                      </div>
                    </div>

                    <div className="sl-store-product-meta">
                      <small>
                        {sp.category?.name ?? 'Shoe Store Collection'}
                      </small>
                      <strong>{sp.name}</strong>
                    </div>

                    <div className="sl-store-product-bottom">
                      <strong>{layKhoangGia(sp)}</strong>
                      <small>
                        {activeVariants.length} biến thể
                      </small>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Banner cuối trang */}
        <section className="sl-store-banner" id="story">
          <div>
            <p className="sl-eyebrow">MADE FOR EVERYDAY</p>
            <h2>
              Đơn giản trong thiết kế.
              <br />
              Tự tin trong chuyển động.
            </h2>
            <p>
              Khám phá những lựa chọn phù hợp với phong cách riêng
              của bạn.
            </p>
          </div>

          <div className="sl-banner-mark">
            S
            <span>
              Shoe
              <br />
              Store
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="sl-store-footer">
        <Link to="/" className="sl-store-logo">
          <span>S</span> Shoe Store
        </Link>

        <p>© 2026 Shoe Store. Everyday, your way.</p>

        <a href="#collection">Trở về đầu trang ↑</a>
      </footer>
    </div>
  );
}
