# 👟 SHOE STORE MANAGEMENT SYSTEM

Hệ thống website thương mại điện tử và quản lý cửa hàng bán giày dép (Fullstack Monorepo) được phát triển bởi nhóm 6 thành viên. Dự án đã được chia sẵn khung thư mục, định tuyến (Router) và tích hợp kiểm thử tự động (CI) qua GitHub Actions để các thành viên làm việc độc lập mà không bị xung đột code.

---

## 🛠 1. Công nghệ sử dụng (Tech Stack)

Dự án được tổ chức theo cấu trúc Monorepo gồm 2 phần tách biệt trong thư mục `apps/`:

* **Frontend (`apps/web`):**
  * **Framework:** React 19 + Vite 8
  * **Ngôn ngữ:** TypeScript
  * **Điều hướng:** React Router DOM (`react-router-dom`)
  * **Gọi API:** Fetch API (chia theo từng `services/` riêng biệt)
  * **Kiểm tra code:** ESLint + TypeScript Compiler (`tsc`)
* **Backend (`apps/api`):**
  * **Runtime & Framework:** Node.js + Express 5 + TypeScript (`ts-node`)
  * **Cơ sở dữ liệu:** PostgreSQL
  * **ORM:** Prisma ORM (`v6.19.3`)
  * **Bảo mật & Xác thực:** JWT (`jsonwebtoken`), mã hóa mật khẩu (`bcryptjs`), CORS
* **DevOps & Quản lý mã nguồn:**
  * **CI/CD:** GitHub Actions (Tự động kiểm tra lỗi Build, TypeScript và ESLint mỗi khi Push hoặc tạo Pull Request vào `main` / `dev`).
  * **Quản lý gói:** npm (đã khóa cứng phiên bản qua `.npmrc` và `package-lock.json`).

---

## 👥 2. Bảng phân công nhiệm vụ (6 Thành viên)

Mỗi thành viên phụ trách **trọn vẹn 1 luồng chức năng (cả Frontend lẫn Backend)** trong thư mục riêng của mình:

| Thành viên | Chức năng phụ trách | Phần Frontend (`apps/web/src/`) | Phần Backend (`apps/api/src/modules/`) | Đường dẫn API gốc |
| :--- | :--- | :--- | :--- | :--- |
| **Người 1 (Nhóm trưởng)** | Đăng nhập, Đăng ký, Phân quyền & Tích hợp hệ thống | `pages/auth/`<br>`services/authService.ts`<br>`types/auth.ts` | `modules/auth/auth.router.ts`<br>*(Quản lý chung `schema.prisma`, `app.ts`, `App.tsx`)* | `/api/auth` |
| **Người 2** | Quản lý sản phẩm, Biến thể (Size/Màu) & Tồn kho (Admin) | `pages/admin-products/`<br>`services/productService.ts`<br>`types/product.ts` | `modules/products/product.router.ts` | `/api/products` |
| **Người 3** | Trang chủ, Danh mục giày, Tìm kiếm, Lọc & Chi tiết giày (Khách) | `pages/catalog/`<br>`services/catalogService.ts`<br>`types/catalog.ts` | `modules/catalog/catalog.router.ts` | `/api/catalog` |
| **Người 4** | Giỏ hàng, Kiểm tra tồn kho & Thanh toán tạo đơn hàng (Checkout) | `pages/checkout/`<br>`services/cartService.ts`<br>`types/cart.ts` | `modules/cart/cart.router.ts` | `/api/cart` |
| **Người 5** | Quản lý đơn hàng (Duyệt đơn, Đổi trạng thái) & Thống kê doanh thu | `pages/admin-orders/`<br>`services/orderService.ts`<br>`types/order.ts` | `modules/orders/order.router.ts` | `/api/orders` |
| **Người 6** | Hồ sơ khách hàng, Sổ địa chỉ nhận hàng & Lịch sử đơn đã mua | `pages/customer/`<br>`services/customerService.ts`<br>`types/customer.ts` | `modules/customer/customer.router.ts` | `/api/customer` |

---

## 📂 3. Cấu trúc thư mục & Ranh giới sở hữu File

Để tránh ghi đè code của nhau (Merge Conflict), dự án phân chia ranh giới như sau:

```text
shoe-store/
├── .github/workflows/ci.yml           # Tự động kiểm tra lỗi khi đẩy code lên GitHub
├── .npmrc                             # Khóa cứng phiên bản thư viện (save-exact=true)
└── apps/
    ├── api/                           # ================= BACKEND =================
    │   ├── prisma/
    │   │   ├── schema.prisma          # [CHỈ NGƯỜI 1 SỬA] Cấu trúc bảng Database
    │   │   └── seed.ts                # [CHỈ NGƯỜI 1 SỬA] Dữ liệu giày mẫu ban đầu
    │   └── src/
    │       ├── config/prisma.ts       # Kết nối PrismaClient dùng chung
    │       ├── modules/               # --> MỖI THÀNH VIÊN CODE TRONG 1 THƯ MỤC <--
    │       │   ├── auth/              # Người 1: auth.router.ts
    │       │   ├── products/          # Người 2: product.router.ts
    │       │   ├── catalog/           # Người 3: catalog.router.ts
    │       │   ├── cart/              # Người 4: cart.router.ts
    │       │   ├── orders/            # Người 5: order.router.ts
    │       │   └── customer/          # Người 6: customer.router.ts
    │       ├── app.ts                 # [CHỈ NGƯỜI 1 SỬA] Đã khai báo sẵn toàn bộ route
    │       └── server.ts              # Chạy cổng 3000
    │
    └── web/                           # ================= FRONTEND ================
        └── src/
            ├── components/            # Component dùng chung
            ├── pages/                 # --> MỖI THÀNH VIÊN CODE GIAO DIỆN TẠI ĐÂY <--
            │   ├── auth/              # Người 1: LoginPage.tsx
            │   ├── admin-products/    # Người 2: ProductManagementPage.tsx
            │   ├── catalog/           # Người 3: ProductListPage.tsx
            │   ├── checkout/          # Người 4: CartPage.tsx
            │   ├── admin-orders/      # Người 5: OrderManagementPage.tsx
            │   └── customer/          # Người 6: ProfilePage.tsx
            ├── services/              # File gọi API riêng của từng người
            ├── types/                 # File định nghĩa kiểu TypeScript riêng của từng người
            └── App.tsx                # [CHỈ NGƯỜI 1 SỬA] Đã chia sẵn đường dẫn cho 6 trang
