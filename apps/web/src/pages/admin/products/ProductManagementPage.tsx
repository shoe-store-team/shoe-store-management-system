
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductForm } from '../../../components/ProductForm';
import { ProductTable } from '../../../components/ProductTable';
import { productService } from '../../../services/productService';
import type {
  SanPham,
  TaoSanPhamDto,
  CapNhatSanPhamDto,
} from '../../../types/product';

export function ProductManagementPage() {
  const [sanPhams, setSanPhams] = useState<SanPham[]>([]);
  const [sanPhamDangSua, setSanPhamDangSua] = useState<SanPham | null>(null);
  const [tuKhoa, setTuKhoa] = useState('');
  const [danhMucLoc, setDanhMucLoc] = useState('all');
  const [hienForm, setHienForm] = useState(false);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');

  // Tải lại danh sách sản phẩm khi cần làm mới hoặc sau CRUD.
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

  // Tải dữ liệu lần đầu khi mở trang.
  useEffect(() => {
    let daHuy = false;

    async function taiDuLieuBanDau() {
      try {
        const data = await productService.layTatCa();

        if (!daHuy) {
          setSanPhams(data);
        }
      } catch (error) {
        if (!daHuy) {
          setLoi(
            error instanceof Error
              ? error.message
              : 'Không thể tải sản phẩm.'
          );
        }
      } finally {
        if (!daHuy) {
          setDangTai(false);
        }
      }
    }

    void taiDuLieuBanDau();

    return () => {
      daHuy = true;
    };
  }, []);

  // Lấy danh sách danh mục từ dữ liệu sản phẩm.
  const danhMucs = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    sanPhams.forEach((sp) => {
      if (sp.category) {
        map.set(sp.category.id, sp.category);
      }
    });

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'vi')
    );
  }, [sanPhams]);

  // Tìm kiếm và lọc sản phẩm.
  const sanPhamHienThi = useMemo(
    () =>
      sanPhams.filter((sp) => {
        const keyword = tuKhoa.trim().toLocaleLowerCase('vi');

        const matchText =
          !keyword ||
          sp.name.toLocaleLowerCase('vi').includes(keyword) ||
          (sp.description ?? '').toLocaleLowerCase('vi').includes(keyword) ||
          sp.variants.some((v) =>
            `${v.color} ${v.size}`.toLocaleLowerCase('vi').includes(keyword)
          );

        const matchCategory =
          danhMucLoc === 'all' || sp.category?.id === danhMucLoc;

        return matchText && matchCategory;
      }),
    [sanPhams, tuKhoa, danhMucLoc]
  );

  // Tính tổng số lượng tồn kho.
  const tongTonKho = sanPhams.reduce(
    (sum, sp) =>
      sum + sp.variants.reduce((variantSum, v) => variantSum + v.stock, 0),
    0
  );

  // Đếm sản phẩm có tổng tồn kho không quá 5.
  const canhBaoTon = sanPhams.filter(
    (sp) =>
      sp.variants.reduce((sum, v) => sum + v.stock, 0) <= 5
  ).length;

  // Thêm sản phẩm.
  async function themSanPham(data: TaoSanPhamDto) {
    setDangXuLy(true);
    setLoi('');
    setThongBao('');

    try {
      await productService.them(data);
      await taiSanPham();

      setHienForm(false);
      setThongBao('Đã thêm sản phẩm thành công.');
    } catch (error) {
      setLoi(
        error instanceof Error
          ? error.message
          : 'Không thể thêm sản phẩm.'
      );
    } finally {
      setDangXuLy(false);
    }
  }

  // Cập nhật sản phẩm.
  async function capNhatSanPham(
    id: string,
    data: CapNhatSanPhamDto
  ) {
    setDangXuLy(true);
    setLoi('');
    setThongBao('');

    try {
      await productService.capNhat(id, data);
      await taiSanPham();

      setSanPhamDangSua(null);
      setHienForm(false);
      setThongBao('Đã cập nhật thông tin sản phẩm.');
    } catch (error) {
      setLoi(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật sản phẩm.'
      );
    } finally {
      setDangXuLy(false);
    }
  }

  // Xóa sản phẩm.
  async function xoaSanPham(id: string, name: string) {
    if (!window.confirm(`Bạn có chắc muốn xóa "${name}"?`)) {
      return;
    }

    setLoi('');
    setThongBao('');

    try {
      await productService.xoa(id);

      setSanPhams((current) =>
        current.filter((sp) => sp.id !== id)
      );

      setThongBao(`Đã xóa sản phẩm "${name}".`);

      if (sanPhamDangSua?.id === id) {
        setSanPhamDangSua(null);
        setHienForm(false);
      }
    } catch (error) {
      setLoi(
        error instanceof Error
          ? error.message
          : 'Không thể xóa sản phẩm.'
      );
    }
  }

  // Mở form chỉnh sửa.
  function batDauSua(sp: SanPham) {
    setSanPhamDangSua(sp);
    setHienForm(true);
    setThongBao('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Mở form thêm mới.
  function batDauThem() {
    setSanPhamDangSua(null);
    setHienForm(true);
    setThongBao('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="sl-admin-shell">
      <aside className="sl-sidebar">
        <a className="sl-brand" href="/admin/products">
          <span className="sl-brand-mark">S</span>
          <span>
            Shoe <span> Store</span>
          </span>
        </a>

        <p className="sl-nav-label">TỔNG QUAN</p>

        <nav className="sl-side-nav">
          <a href="/admin/products" className="sl-side-link">
            <span>▦</span> Bảng điều khiển
          </a>
          <a href="/admin/products" className="sl-side-link active">
            <span>◈</span> Sản phẩm
          </a>
          <a href="/admin/products" className="sl-side-link">
            <span>▤</span> Đơn hàng
          </a>
          <a href="/admin/products" className="sl-side-link">
            <span>▧</span> Kho hàng
          </a>
          <a href="/admin/products" className="sl-side-link">
            <span>◇</span> Khuyến mãi
          </a>
          <a href="/" className="sl-side-link">
            <span>⌂</span> Xem cửa hàng
          </a>
        </nav>

        <div className="sl-sidebar-promo">
          <span>✦</span>
          <strong>Quản lý tinh gọn</strong>
          <p>Theo dõi sản phẩm và số lượng tồn kho tại một nơi.</p>
        </div>

        <div className="sl-profile">
          <div className="sl-avatar">AD</div>
          <span>
            <strong>Quản trị viên</strong>
            <small>ADMIN</small>
          </span>
          <span className="sl-profile-more">···</span>
        </div>
      </aside>

      <main className="sl-admin-main">
        <header className="sl-admin-topbar">
          <div className="sl-breadcrumb">
            Quản trị <span>/</span> <strong>Sản phẩm</strong>
          </div>

          <div className="sl-topbar-right">
            <label className="sl-top-search">
              ⌕
              <input
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tìm sản phẩm, size, màu..."
              />
            </label>

            <span className="sl-topbar-divider" />
            <span className="sl-admin-date">Shoe Store DAY · QUẢN TRỊ</span>
          </div>
        </header>

        <div className="sl-admin-content">
          <div className="sl-page-heading">
            <div>
              <p className="sl-eyebrow">PRODUCT MANAGEMENT</p>
              <h1>Quản lý sản phẩm</h1>
              <p>
                Theo dõi danh mục, biến thể và tình trạng kinh doanh của cửa
                hàng.
              </p>
            </div>

            <button
              className="sl-button sl-button-dark"
              onClick={batDauThem}
            >
              ＋ Thêm sản phẩm
            </button>
          </div>

          <div className="sl-stat-grid">
            <article className="sl-stat-card">
              <span className="sl-stat-icon">◈</span>
              <small>TỔNG SẢN PHẨM</small>
              <strong>{sanPhams.length}</strong>
              <em>Trong danh mục</em>
            </article>

            <article className="sl-stat-card">
              <span className="sl-stat-icon sage">▦</span>
              <small>TỔNG TỒN KHO</small>
              <strong>{tongTonKho.toLocaleString('vi-VN')}</strong>
              <em>Tất cả biến thể</em>
            </article>

            <article className="sl-stat-card">
              <span className="sl-stat-icon sand">◇</span>
              <small>DANH MỤC</small>
              <strong>{danhMucs.length}</strong>
              <em>Đang được sử dụng</em>
            </article>

            <article className="sl-stat-card">
              <span className="sl-stat-icon rose">!</span>
              <small>SẢN PHẨM TỒN THẤP</small>
              <strong>{canhBaoTon}</strong>
              <em>Có tổng tồn ≤ 5</em>
            </article>
          </div>

          {loi && <div className="sl-alert sl-alert-error">{loi}</div>}

          {thongBao && (
            <div className="sl-alert sl-alert-success">{thongBao}</div>
          )}

          {hienForm && (
            <ProductForm
              key={sanPhamDangSua?.id ?? 'new'}
              sanPhamDangSua={sanPhamDangSua}
              danhMucs={danhMucs}
              dangXuLy={dangXuLy}
              onThem={themSanPham}
              onCapNhat={capNhatSanPham}
              onHuySua={() => {
                setHienForm(false);
                setSanPhamDangSua(null);
              }}
            />
          )}

          <section className="sl-panel sl-admin-data">
            <div className="sl-panel-heading sl-list-heading">
              <div>
                <h2>Danh sách sản phẩm</h2>
                <p>{sanPhamHienThi.length} kết quả phù hợp</p>
              </div>

              <div className="sl-list-controls">
                <select
                  value={danhMucLoc}
                  onChange={(e) => setDanhMucLoc(e.target.value)}
                >
                  <option value="all">Tất cả danh mục</option>

                  {danhMucs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <button
                  className="sl-button sl-button-light"
                  onClick={() => void taiSanPham()}
                >
                  ↻ Làm mới
                </button>
              </div>
            </div>

            {dangTai ? (
              <div className="sl-loading">
                Đang tải danh sách sản phẩm...
              </div>
            ) : (
              <ProductTable
                sanPhams={sanPhamHienThi}
                onSua={batDauSua}
                onXoa={xoaSanPham}
              />
            )}
          </section>

          <p className="sl-page-footnote">
            Shoe Store Admin · Dữ liệu được tải trực tiếp từ Shoe Store API.
          </p>
        </div>
      </main>
    </div>
  );
}
