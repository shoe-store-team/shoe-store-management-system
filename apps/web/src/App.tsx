import { useEffect, useState } from 'react'
import './index.css'
import type { SanPham, TaoSanPhamDto, CapNhatSanPhamDto } from './types/product'
import { productService } from './services/productService'
import { ProductForm } from './components/ProductForm'
import { ProductTable } from './components/ProductTable'

export default function App() {
  const [sanPhamDangSua, setSanPhamDangSua] = useState<SanPham | null>(null)
  const [sanPhams, setSanPhams] = useState<SanPham[]>([])
  const [dangTai, setDangTai] = useState(true)
  const [dangXuLy, setDangXuLy] = useState(false)
  const [thongBao, setThongBao] = useState('')
  const [loi, setLoi] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadData() {
      try {
        const data = await productService.layTatCa()
        if (!ignore) {
          setSanPhams(data)
        }
      } catch (error) {
        if (!ignore) {
          setLoi(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải danh sách')
        }
      } finally {
        if (!ignore) {
          setDangTai(false)
        }
      }
    }

    void loadData()

    return () => {
      ignore = true
    }
  }, [])

  async function xuLyThem(data: TaoSanPhamDto) {
    setThongBao('')
    setDangXuLy(true)
    try {
      const spMoi = await productService.them(data)
      setSanPhams((prev) => [...prev, spMoi])
      setThongBao('Thêm sản phẩm thành công!')
    } catch (error) {
      setThongBao(error instanceof Error ? error.message : 'Lỗi khi thêm')
    } finally {
      setDangXuLy(false)
    }
  }

  async function xuLyCapNhat(id: string, data: CapNhatSanPhamDto) {
    setThongBao('')
    setDangXuLy(true)
    try {
      const spDaSua = await productService.capNhat(id, data)
      setSanPhams((prev) => prev.map((sp) => (sp.id === id ? spDaSua : sp)))
      setSanPhamDangSua(null)
      setThongBao('Cập nhật sản phẩm thành công!')
    } catch (error) {
      setThongBao(error instanceof Error ? error.message : 'Lỗi khi cập nhật')
    } finally {
      setDangXuLy(false)
    }
  }

  async function xuLyXoa(id: string, name: string) {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm "${name}" không?`)) return

    try {
      await productService.xoa(id)
      setSanPhams((prev) => prev.filter((sp) => sp.id !== id))
      alert('Xóa sản phẩm thành công!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa')
    }
  }

  return (
    <main className="trang-quan-ly">
      <header className="thanh-dau-trang">
        <div>
          <h1>SHOE STORE</h1>
          <p>Hệ thống quản lý cửa hàng giày</p>
        </div>
        <span className="nhan-quan-tri">Quản trị</span>
      </header>

      <section className="noi-dung">
        <ProductForm
          key={sanPhamDangSua?.id ?? 'create'}
          sanPhamDangSua={sanPhamDangSua}
          dangXuLy={dangXuLy}
          onThem={xuLyThem}
          onCapNhat={xuLyCapNhat}
          onHuySua={() => {
            setSanPhamDangSua(null)
            setThongBao('')
          }}
        />

        {thongBao && <p role="status">{thongBao}</p>}

        <div className="tieu-de">
          <div>
            <h2>Danh sách sản phẩm</h2>
            <p>Quản lý thông tin các mẫu giày trong cửa hàng.</p>
          </div>
          <span className="tong-san-pham">Tổng: {sanPhams.length} sản phẩm</span>
        </div>

        {dangTai && <p>Đang tải sản phẩm...</p>}
        {loi && <p className="thong-bao-loi">{loi}. Hãy kiểm tra API và kết nối mạng.</p>}

        {!dangTai && !loi && (
          <ProductTable
            sanPhams={sanPhams}
            onSua={(sp) => setSanPhamDangSua(sp)}
            onXoa={xuLyXoa}
          />
        )}
      </section>
    </main>
  )
}