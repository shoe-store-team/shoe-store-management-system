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

# QUY ƯỚC PHÁT TRIỂN DỰ ÁN SHOE STORE

## 1. Nguyên tắc phân công

- Mỗi thành viên chịu trách nhiệm chính cho chức năng được giao, bao gồm frontend, backend và kiểm thử chức năng đó.
- Mỗi file có một người chịu trách nhiệm chính.
- Không tự ý sửa file thuộc module của thành viên khác khi chưa trao đổi.
- Các file dùng chung do nhóm trưởng quản lý và tích hợp.
- Mỗi thành viên phải kiểm tra chức năng của mình trước khi gửi Pull Request.

## 2. Phân công sở hữu

| Thành viên | Chức năng | Frontend | Backend |
|---|---|---|---|
| Người 1 — Nhóm trưởng | Auth, phân quyền, tích hợp | `pages/auth/`, `services/authService.ts`, `types/auth.ts` | `modules/auth/` |
| Người 2 | Quản lý sản phẩm, biến thể, tồn kho | `pages/admin-products/`, `services/productService.ts`, `types/product.ts` | `modules/products/` |
| Người 3 | Trang chủ, danh mục, tìm kiếm, chi tiết giày | `pages/catalog/`, `services/catalogService.ts`, `types/catalog.ts` | `modules/catalog/` |
| Người 4 | Giỏ hàng và tạo đơn | `pages/checkout/`, `services/cartService.ts`, `types/cart.ts` | `modules/cart/` và phần checkout được thống nhất |
| Người 5 | Quản lý đơn hàng, thống kê | `pages/admin-orders/`, `services/orderService.ts`, `types/order.ts` | `modules/orders/` |
| Người 6 | Hồ sơ, địa chỉ, lịch sử mua hàng | `pages/customer/`, `services/customerService.ts`, `types/customer.ts` | `modules/customer/` |

## 3. File dùng chung

Nhóm trưởng là người tích hợp và chịu trách nhiệm chính đối với:

- `apps/web/src/App.tsx`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/`
- Cấu hình môi trường và cấu hình dùng chung
- `package.json` gốc, `package-lock.json` và cấu hình CI

Các thành viên được đề xuất thay đổi, nhưng phải trao đổi và thống nhất trước khi sửa các file này.

## 4. Quy tắc API

- Mỗi API có một thành viên chịu trách nhiệm chính.
- Frontend gọi API thông qua file trong `services/`.
- Không tự ý đổi URL, tên trường dữ liệu hoặc định dạng response mà chưa thông báo cho bên đang sử dụng API.
- API phải kiểm tra dữ liệu đầu vào và quyền truy cập ở backend.
- Các chức năng dùng chung dữ liệu sản phẩm, tài khoản và đơn hàng phải thống nhất kiểu dữ liệu trước khi triển khai.

## 5. Quy tắc Git

- Không commit trực tiếp lên `main`.
- Mỗi thành viên làm việc trên nhánh riêng.
- Đặt tên nhánh theo chức năng, ví dụ `feature/products`, `feature/auth`.
- Commit chỉ bao gồm những file thuộc phần công việc của mình.
- Tạo Pull Request để nhóm trưởng kiểm tra trước khi hợp nhất.
- Không tự ý giải quyết xung đột bằng cách xóa code của thành viên khác.

## 6. Điều kiện bàn giao

Một chức năng chỉ được xem là hoàn thành khi:

1. Giao diện hoạt động.
2. API hoạt động và kết nối database đúng.
3. Dữ liệu đầu vào được kiểm tra.
4. Có xử lý lỗi và thông báo phù hợp.
5. Không làm hỏng chức năng đã hoàn thành của thành viên khác.
6. Build và các bước kiểm tra tự động đều đạt.
