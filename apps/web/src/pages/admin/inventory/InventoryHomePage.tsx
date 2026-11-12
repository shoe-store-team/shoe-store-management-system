
import { Link } from "react-router-dom";
import "./InventoryHomePage.css";

const inventoryItems = [
  {
    title: "Tồn kho",
    description: "Theo dõi số lượng hàng hóa hiện có trong kho.",
    icon: "📦",
    path: "/admin/inventory/check",
  },
  {
    title: "Nhập kho",
    description: "Quản lý các phiếu nhập hàng vào kho.",
    icon: "📥",
    path: "/admin/inventory/import",
  },
  {
    title: "Xuất kho",
    description: "Theo dõi và quản lý hoạt động xuất kho.",
    icon: "📤",
    path: "/admin/inventory/export",
  },
  {
    title: "Điều chỉnh",
    description: "Điều chỉnh số lượng tồn kho khi cần thiết.",
    icon: "⚙️",
    path: "/admin/inventory/adjustment",
  },
  {
    title: "Kiểm kê",
    description: "Kiểm tra và đối chiếu số lượng hàng thực tế.",
    icon: "📋",
    path: "/admin/inventory/check",
  },
  {
    title: "Lịch sử",
    description: "Xem lịch sử thay đổi tồn kho.",
    icon: "🕘",
    path: "/admin/inventory/history",
  },
];

export function InventoryHomePage() {
  return (
    <div className="inventory-home">
      <div className="inventory-heading">
        <div>
          <p className="inventory-eyebrow">TRUNG TÂM VẬN HÀNH</p>
          <h1>Kho hàng</h1>
          <p>Theo dõi và quản lý hoạt động kho hàng tại một nơi.</p>
        </div>
      </div>

      <div className="inventory-tabs">
        {inventoryItems.map((item) => (
          <Link key={item.title} to={item.path}>
            {item.title}
          </Link>
        ))}
      </div>

      <div className="inventory-card-grid">
        {inventoryItems.map((item) => (
          <Link
            key={item.title}
            to={item.path}
            className="inventory-function-card"
          >
            <span className="inventory-function-icon">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="inventory-card-action">
              Truy cập chức năng →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
