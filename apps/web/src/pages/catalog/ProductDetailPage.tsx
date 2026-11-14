import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { cartService } from "../../services/cartService";
import { productService } from "../../services/productService";
import { dinhDangTien } from "../../services/request";
import type { ChiTietSanPham } from "../../types/cart";
import "./ProductDetailPage.css";
import { useAuth } from "../../stores/authStore";

// Màu hiển thị cho các tên màu thường gặp; màu lạ sẽ dùng nền xám.
const MAU_HIEN_THI: Record<string, string> = {
  black: "#1c1c1c",
  white: "#ffffff",
  red: "#d63a3a",
  blue: "#2f5fd0",
  green: "#2f8f4e",
  gray: "#9ca3af",
  grey: "#9ca3af",
  brown: "#7a4b2a",
  yellow: "#eab308",
  pink: "#ec7fa9",
  orange: "#f08a24",
  navy: "#1f2a52",
  beige: "#d9c7a3",
  aqua: "#22b8cf",
};

const SO_LUONG_SAP_HET = 5;

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [sp, setSp] = useState<ChiTietSanPham | null>(null);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [mau, setMau] = useState("");
  const [size, setSize] = useState<number | null>(null);
  const [soLuong, setSoLuong] = useState(1);
  const [dangThem, setDangThem] = useState(false);

  useEffect(() => {
    if (!id) return;
    productService
      .layChiTiet(id)
      .then((data) => {
        setSp(data);
        setMau(data.variants[0]?.color ?? "");
      })
      .catch((e: Error) => setLoi(e.message));
  }, [id]);

  const cacMau = useMemo(
    () => [...new Set(sp?.variants.map((v) => v.color) ?? [])],
    [sp],
  );
  const cacSize = useMemo(
    () => sp?.variants.filter((v) => v.color === mau) ?? [],
    [sp, mau],
  );
  const bienThe = cacSize.find((v) => v.size === size) ?? null;
  // Ưu tiên ảnh của màu đang chọn.
// Nếu biến thể chưa có ảnh thì dùng ảnh chung sản phẩm.
const anhTheoMau =
  sp?.variants.find(
    (variant) => variant.color === mau && variant.imageUrl
  )?.imageUrl ?? sp?.imageUrl ?? null;
  const chonMau = (m: string) => {
    setMau(m);
    setSize(null);
    setSoLuong(1);
    setThongBao("");
    setLoi("");
  };

  const chonSize = (s: number, tonKho: number) => {
    setSize(s);
    setSoLuong((q) => Math.min(q, tonKho));
    setThongBao("");
    setLoi("");
  };

  const doiSoLuong = (giaTri: number) => {
    const toiDa = bienThe?.stock ?? 1;
    setSoLuong(Math.min(toiDa, Math.max(1, giaTri || 1)));
  };

  const themVaoGio = async () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: location.pathname + location.search,
        },
      });
      return;
    }

    if (!bienThe || dangThem) return;

    setLoi("");
    setThongBao("");
    setDangThem(true);

    try {
      await cartService.them(bienThe.id, soLuong);
      setThongBao("Đã thêm vào giỏ hàng");
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangThem(false);
    }
  };

    if (!sp) {
    return (
      <div className="pd-wrap">
        {loi ? (
          <div className="pd-alert pd-alert--loi">{loi}</div>
        ) : (
          <div className="pd-dang-tai">Đang tải...</div>
        )}
      </div>
    );
  }

  const gia = bienThe?.price ?? sp.basePrice;
  const hetHang = bienThe !== null && bienThe.stock === 0;
  const sapHet =
    bienThe !== null && bienThe.stock > 0 && bienThe.stock <= SO_LUONG_SAP_HET;
  const khongThem = !bienThe || hetHang || dangThem;

  
return (
  <div className="pd-wrap">
    <nav className="pd-breadcrumb" aria-label="Điều hướng">
      <Link to="/">Cửa hàng</Link>
      <span>/</span>
      {sp.category && (
        <>
          <span>{sp.category.name}</span>
          <span>/</span>
        </>
      )}
      <span className="pd-breadcrumb__hien-tai">{sp.name}</span>
    </nav>

    <div className="pd-layout">
      <div className="pd-anh">
        {anhTheoMau ? (
          <img
            src={anhTheoMau}
            alt={`${sp.name} - ${mau || 'ảnh sản phẩm'}`}
          />
        ) : (
          <div className="pd-anh__trong">Chưa có ảnh</div>
        )}
      </div>

      <div className="pd-thong-tin">
        {sp.category && (
          <span className="pd-danh-muc">{sp.category.name}</span>
        )}

        <h1 className="pd-ten">{sp.name}</h1>
        <div className="pd-gia">{dinhDangTien(gia)}</div>

        {sp.description && (
          <p className="pd-mo-ta">{sp.description}</p>
        )}

        <div className="pd-nhom">
          <div className="pd-nhom__tieu-de">
            Màu sắc <span className="pd-nhom__gia-tri">{mau}</span>
          </div>

          <div className="pd-chips">
            {cacMau.map((m) => (
              <button
                key={m}
                type="button"
                className={`pd-chip pd-chip--mau${m === mau ? " is-chon" : ""}`}
                onClick={() => chonMau(m)}
                aria-pressed={m === mau}
              >
                <span
                  className="pd-cham-mau"
                  style={{
                    background: MAU_HIEN_THI[m.toLowerCase()] ?? "#d1d5db",
                  }}
                />
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="pd-nhom">
          <div className="pd-nhom__tieu-de">
            Size{" "}
            {size !== null && (
              <span className="pd-nhom__gia-tri">{size}</span>
            )}
          </div>

          <div className="pd-chips">
            {cacSize.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`pd-chip pd-chip--size${v.size === size ? " is-chon" : ""}${v.stock === 0 ? " is-het" : ""}`}
                disabled={v.stock === 0}
                onClick={() => chonSize(v.size, v.stock)}
                aria-pressed={v.size === size}
                title={v.stock === 0 ? "Hết hàng" : undefined}
              >
                {v.size}
              </button>
            ))}
          </div>

          <div className="pd-ton-kho" aria-live="polite">
            {!bienThe && (
              <span className="pd-ton-kho--nhac">Vui lòng chọn size</span>
            )}
            {hetHang && (
              <span className="pd-ton-kho--het">Hết hàng</span>
            )}
            {sapHet && (
              <span className="pd-ton-kho--sap-het">
                Chỉ còn {bienThe.stock} sản phẩm
              </span>
            )}
            {bienThe && !hetHang && !sapHet && (
              <span className="pd-ton-kho--con">
                Còn {bienThe.stock} sản phẩm
              </span>
            )}
          </div>
        </div>

        <div className="pd-nhom">
          <div className="pd-nhom__tieu-de">Số lượng</div>

          <div className="pd-so-luong">
            <button
              type="button"
              onClick={() => doiSoLuong(soLuong - 1)}
              disabled={!bienThe || soLuong <= 1}
              aria-label="Giảm số lượng"
            >
              −
            </button>

            <input
              type="number"
              min={1}
              max={bienThe?.stock ?? 1}
              value={soLuong}
              disabled={!bienThe || hetHang}
              onChange={(e) => doiSoLuong(Number(e.target.value))}
              aria-label="Số lượng"
            />

            <button
              type="button"
              onClick={() => doiSoLuong(soLuong + 1)}
              disabled={!bienThe || soLuong >= (bienThe?.stock ?? 1)}
              aria-label="Tăng số lượng"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          className="pd-nut-them"
          disabled={khongThem}
          onClick={themVaoGio}
        >
          {dangThem
            ? "Đang thêm..."
            : hetHang
              ? "Hết hàng"
              : !bienThe
                ? "Chọn size để thêm vào giỏ"
                : "Thêm vào giỏ"}
        </button>

        {thongBao && (
          <div className="pd-alert pd-alert--ok" role="status">
            {thongBao}. <Link to="/cart">Xem giỏ hàng</Link>
          </div>
        )}

        {loi && (
          <div className="pd-alert pd-alert--loi" role="alert">
            {loi}
          </div>
        )}
      </div>
    </div>
  </div>
);
}
