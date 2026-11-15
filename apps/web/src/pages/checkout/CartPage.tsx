import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { dinhDangTien } from '../../services/request';
import type { GioHang } from '../../types/cart';
import './CartPage.css';

export function CartPage() {
  const dieuHuong = useNavigate();

  const [gio, setGio] = useState<GioHang | null>(null);
  const [loi, setLoi] = useState('');

  // Lấy thông tin giỏ hàng từ API
  useEffect(() => {
    cartService
      .layGioHang()
      .then(setGio)
      .catch((e: Error) => setLoi(e.message));
  }, []);

  // Cập nhật giỏ hàng sau khi tăng, giảm số lượng hoặc xóa sản phẩm
  const capNhatGio = useCallback(
    async (thaoTac: () => Promise<GioHang>) => {
      try {
        setLoi('');
        setGio(await thaoTac());
      } catch (e) {
        setLoi((e as Error).message);
      }
    },
    [],
  );

  // Hiển thị trạng thái tải dữ liệu
  if (!gio) {
    return (
      <div className="gh-wrap">
        {loi ? (
          <div className="gh-alert gh-alert--loi">{loi}</div>
        ) : (
          <div className="gh-dang-tai">Đang tải giỏ hàng...</div>
        )}
      </div>
    );
  }

  // Không cho thanh toán nếu giỏ trống hoặc có sản phẩm không hợp lệ
  const khongThanhToanDuoc =
    gio.items.length === 0 || gio.items.some((i) => !i.available);

  const coSanPhamLoi = gio.items.some((i) => !i.available);

  return (
    <div className="gh-wrap">
      <h1 className="gh-tieu-de">
        Giỏ hàng{' '}
        <span className="gh-tieu-de__dem">
          ({gio.itemCount} sản phẩm)
        </span>
      </h1>

      {/* Hiển thị lỗi nếu thao tác giỏ hàng thất bại */}
      {loi && (
        <div className="gh-alert gh-alert--loi" role="alert">
          {loi}
        </div>
      )}

      {gio.items.length === 0 ? (
        // Trường hợp giỏ hàng trống
        <div className="gh-trong">
          <p>Giỏ hàng của bạn đang trống.</p>

          <Link to="/" className="gh-nut gh-nut--chinh">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="gh-grid">
          {/* Danh sách sản phẩm trong giỏ hàng */}
          <ul className="gh-danh-sach">
            {gio.items.map((i) => (
              <li
                key={i.id}
                className={`gh-item${i.available ? '' : ' is-loi'}`}
              >
                {/* Ảnh sản phẩm */}
                <Link
                  to={`/product/${i.productId}`}
                  className="gh-item__anh"
                >
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt={i.productName} />
                  ) : (
                    <span>Chưa có ảnh</span>
                  )}
                </Link>

                {/* Thông tin sản phẩm */}
                <div className="gh-item__thong-tin">
                  <Link
                    to={`/product/${i.productId}`}
                    className="gh-item__ten"
                  >
                    {i.productName}
                  </Link>

                  <div className="gh-item__phan-loai">
                    Màu: {i.color} · Size: {i.size}
                  </div>

                  <div className="gh-item__don-gia">
                    {dinhDangTien(i.unitPrice)}
                  </div>

                  {/* Cảnh báo nếu sản phẩm không đủ điều kiện mua */}
                  {!i.available && (
                    <div className="gh-item__canh-bao" role="alert">
                      {i.unavailableReason === 'INACTIVE'
                        ? 'Sản phẩm đã ngừng bán, vui lòng xóa khỏi giỏ hàng'
                        : `Không đủ tồn kho (còn ${i.stock})`}
                    </div>
                  )}
                </div>

                {/* Thao tác số lượng và xóa sản phẩm */}
                <div className="gh-item__thao-tac">
                  <div className="gh-so-luong">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      disabled={i.quantity <= 1}
                      onClick={() =>
                        capNhatGio(() =>
                          cartService.capNhatSoLuong(
                            i.id,
                            i.quantity - 1,
                          ),
                        )
                      }
                    >
                      −
                    </button>

                    <span>{i.quantity}</span>

                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      disabled={i.quantity >= i.stock}
                      onClick={() =>
                        capNhatGio(() =>
                          cartService.capNhatSoLuong(
                            i.id,
                            i.quantity + 1,
                          ),
                        )
                      }
                    >
                      +
                    </button>
                  </div>

                  {/* Thành tiền của sản phẩm */}
                  <div className="gh-item__thanh-tien">
                    {dinhDangTien(i.lineTotal)}
                  </div>

                  {/* Xóa sản phẩm khỏi giỏ hàng */}
                  <button
                    type="button"
                    className="gh-xoa"
                    onClick={() =>
                      capNhatGio(() => cartService.xoa(i.id))
                    }
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Tổng kết giỏ hàng */}
          <aside className="gh-tong-ket">
            <h2>Tóm tắt đơn hàng</h2>

            <dl className="gh-dong-tien">
              <div>
                <dt>Tạm tính</dt>
                <dd>{dinhDangTien(gio.payableSubtotal)}</dd>
              </div>

              <div className="gh-dong-tien__tong">
                <dt>Tổng tiền</dt>
                <dd>{dinhDangTien(gio.payableSubtotal)}</dd>
              </div>
            </dl>

            <p className="gh-ghi-chu">
              Mã giảm giá có thể được nhập và áp dụng tại bước thanh toán.
            </p>

            {/* Chuyển sang trang thanh toán */}
            <button
              type="button"
              className="gh-nut gh-nut--chinh gh-nut--lon"
              disabled={khongThanhToanDuoc}
              onClick={() => dieuHuong('/checkout')}
            >
              Tiến hành thanh toán
            </button>

            {coSanPhamLoi && (
              <p className="gh-nhac">
                Vui lòng xóa hoặc điều chỉnh sản phẩm có cảnh báo để thanh toán.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}