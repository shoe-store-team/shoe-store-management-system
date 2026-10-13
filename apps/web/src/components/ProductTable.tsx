import type { SanPham } from '../types/product'

type ProductTableProps = {
  sanPhams: SanPham[]
  onSua: (sanPham: SanPham) => void
  onXoa: (id: string, name: string) => void
}

export function ProductTable({ sanPhams, onSua, onXoa }: ProductTableProps) {
  if (sanPhams.length === 0) {
    return <p className="khong-co-du-lieu">Chưa có sản phẩm nào.</p>
  }

  return (
    <div className="bang-bao">
      <table>
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
            <th>Danh mục</th>
            <th>Giá bán</th>
            <th>Tồn kho</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sanPhams.map((sanPham) => (
            <tr key={sanPham.id}>
              <td>
                <strong>{sanPham.name}</strong>
                <p className="mo-ta">{sanPham.description || 'Chưa có mô tả'}</p>
              </td>
              <td>{sanPham.category?.name || 'Chưa phân loại'}</td>
              <td className="gia">{sanPham.basePrice.toLocaleString('vi-VN')} đ</td>
              <td>
                {sanPham.variants.reduce((tong, bienThe) => tong + bienThe.stock, 0)}
              </td>
              <td>
                <button type="button" onClick={() => onSua(sanPham)}>
                  Sửa
                </button>{' '}
                <button
                  type="button"
                  className="nut-xoa"
                  onClick={() => onXoa(sanPham.id, sanPham.name)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}