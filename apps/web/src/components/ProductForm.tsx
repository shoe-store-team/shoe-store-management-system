import { useState, useEffect, type FormEvent } from 'react'
import type { SanPham, TaoSanPhamDto, CapNhatSanPhamDto } from '../types/product'

type ProductFormProps = {
  sanPhamDangSua: SanPham | null
  dangXuLy: boolean
  onThem: (data: TaoSanPhamDto) => Promise<void>
  onCapNhat: (id: string, data: CapNhatSanPhamDto) => Promise<void>
  onHuySua: () => void
}

export function ProductForm({
  sanPhamDangSua,
  dangXuLy,
  onThem,
  onCapNhat,
  onHuySua,
}: ProductFormProps) {
  const [tenGiay, setTenGiay] = useState('')
  const [moTa, setMoTa] = useState('')
  const [giaBan, setGiaBan] = useState('')
  const [sizeGiay, setSizeGiay] = useState('40')
  const [mauSac, setMauSac] = useState('Black')
  const [tonKho, setTonKho] = useState('10')

  // Đổ dữ liệu vào form khi bấm nút "Sửa"
  useEffect(() => {
    if (sanPhamDangSua) {
      setTenGiay(sanPhamDangSua.name)
      setMoTa(sanPhamDangSua.description || '')
      setGiaBan(String(sanPhamDangSua.basePrice))
    } else {
      setTenGiay('')
      setMoTa('')
      setGiaBan('')
      setSizeGiay('40')
      setMauSac('Black')
      setTonKho('10')
    }
  }, [sanPhamDangSua])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (sanPhamDangSua) {
      await onCapNhat(sanPhamDangSua.id, {
        name: tenGiay,
        description: moTa,
        basePrice: Number(giaBan),
      })
    } else {
      await onThem({
        name: tenGiay,
        description: moTa,
        basePrice: Number(giaBan),
        size: Number(sizeGiay),
        color: mauSac,
        stock: Number(tonKho),
      })
      // Reset form sau khi thêm mới thành công
      setTenGiay('')
      setMoTa('')
      setGiaBan('')
      setSizeGiay('40')
      setMauSac('Black')
      setTonKho('10')
    }
  }

  return (
    <form className="form-them-san-pham" onSubmit={handleSubmit}>
      <h3>{sanPhamDangSua ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>

      <label>
        Tên giày *
        <input
          type="text"
          value={tenGiay}
          onChange={(e) => setTenGiay(e.target.value)}
          placeholder="Ví dụ: Nike Air Max"
          required
        />
      </label>

      <label>
        Mô tả
        <textarea
          value={moTa}
          onChange={(e) => setMoTa(e.target.value)}
          placeholder="Mô tả sản phẩm"
        />
      </label>

      <label>
        Giá bán (VNĐ) *
        <input
          type="number"
          value={giaBan}
          onChange={(e) => setGiaBan(e.target.value)}
          min="1"
          step="1"
          placeholder="1500000"
          required
        />
      </label>

      {!sanPhamDangSua && (
        <div className="hang-form">
          <label>
            Size giày *
            <input
              type="number"
              value={sizeGiay}
              onChange={(e) => setSizeGiay(e.target.value)}
              min="1"
              step="1"
              required
            />
          </label>

          <label>
            Màu sắc *
            <input
              type="text"
              value={mauSac}
              onChange={(e) => setMauSac(e.target.value)}
              required
            />
          </label>

          <label>
            Tồn kho *
            <input
              type="number"
              value={tonKho}
              onChange={(e) => setTonKho(e.target.value)}
              min="0"
              step="1"
              required
            />
          </label>
        </div>
      )}

      <button type="submit" disabled={dangXuLy}>
        {dangXuLy ? 'Đang lưu...' : sanPhamDangSua ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
      </button>

      {sanPhamDangSua && (
        <button type="button" onClick={onHuySua}>
          Hủy sửa
        </button>
      )}
    </form>
  )
}