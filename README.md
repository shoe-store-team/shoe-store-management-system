# 👟 SHOE STORE MANAGEMENT SYSTEM

Website thương mại điện tử bán giày dép kết hợp hệ thống quản lý cửa hàng, được phát triển bởi nhóm 6 thành viên.

Dự án sử dụng mô hình **Fullstack Monorepo**: frontend và backend nằm trong cùng một repository, được chia thành các workspace riêng biệt. Hệ thống sử dụng PostgreSQL để lưu trữ dữ liệu, Prisma ORM để truy vấn database và GitHub Actions để tự động kiểm tra mã nguồn.

## 📌 1. Mục tiêu dự án

Xây dựng website bán giày dép có các chức năng phục vụ khách hàng và quản trị viên.

### 1.1. Chức năng dành cho khách hàng

- Đăng ký, đăng nhập và đăng xuất.
- Xem danh sách, chi tiết sản phẩm.
- Tìm kiếm, lọc sản phẩm theo danh mục và các tiêu chí phù hợp.
- Xem kích cỡ, màu sắc, biến thể, giá bán và tình trạng tồn kho.
- Thêm, sửa số lượng và xóa sản phẩm trong giỏ hàng.
- Quản lý thông tin cá nhân.
- Thêm, sửa, xóa và lựa chọn nhiều địa chỉ giao hàng.
- Áp dụng mã khuyến mãi và kiểm tra điều kiện sử dụng.
- Đặt hàng, chọn địa chỉ nhận hàng và phương thức thanh toán.
- Thanh toán trực tuyến thông qua cổng thanh toán hoặc môi trường sandbox.
- Xem lịch sử mua hàng, chi tiết đơn hàng và trạng thái xử lý.

### 1.2. Chức năng dành cho quản trị viên

- Quản lý sản phẩm, danh mục, kích cỡ, màu sắc và biến thể.
- Quản lý giá bán và tồn kho.
- Quản lý khuyến mãi, mã giảm giá, thời hạn và điều kiện áp dụng.
- Quản lý đơn hàng và cập nhật trạng thái theo quy trình nghiệp vụ.
- Theo dõi kết quả thanh toán.
- Xem thống kê doanh thu và tình hình bán hàng.
- Quản lý tài khoản, vai trò và quyền truy cập theo phạm vi được phân công.

Các chức năng trên là phạm vi mục tiêu của đồ án. Chức năng nào đã triển khai đến đâu cần được xác nhận qua code và kết quả kiểm thử thực tế.

## 🛠️ 2. Công nghệ sử dụng

### 2.1. Frontend

| Công nghệ | Vai trò |
|---|---|
| React 19 | Xây dựng giao diện người dùng |
| Vite 8 | Chạy môi trường phát triển và build frontend |
| TypeScript | Kiểm tra kiểu dữ liệu |
| React Router DOM | Điều hướng giữa các trang |
| Fetch API | Gửi HTTP request đến backend |
| ESLint | Kiểm tra các vấn đề trong mã nguồn |

Phiên bản Vite và plugin React được quản lý bằng `apps/web/package.json` và `package-lock.json`. Khi thay đổi dependency, cần đồng bộ lockfile và kiểm tra lại build.

### 2.2. Backend

| Công nghệ | Vai trò |
|---|---|
| Node.js | Môi trường chạy JavaScript phía máy chủ |
| Express 5 | Xây dựng REST API |
| TypeScript | Kiểm tra kiểu dữ liệu phía backend |
| PostgreSQL | Lưu trữ dữ liệu |
| Prisma ORM 6.19.3 | Truy vấn database và quản lý schema |
| JSON Web Token (JWT) | Hỗ trợ xác thực người dùng |
| bcryptjs | Băm mật khẩu |
| CORS | Cấu hình truy cập API giữa các origin |

### 2.3. Công cụ phát triển

- **npm Workspaces:** Quản lý frontend và backend trong một monorepo.
- **Docker và Docker Compose:** Khởi chạy PostgreSQL trong môi trường phát triển.
- **Git và GitHub:** Quản lý mã nguồn, branch, Pull Request và review.
- **GitHub Actions:** Tự động kiểm tra dependency, build và các bước đã cấu hình trong CI.
- **Prisma CLI:** Generate Prisma Client, đồng bộ schema hoặc áp dụng migration và chạy seed.

> GitHub Actions hiện được sử dụng cho CI. Chỉ gọi là CI/CD khi dự án có thêm quy trình triển khai tự động tương ứng.

## 📂 3. Cấu trúc thư mục

Cấu trúc dưới đây thể hiện các khu vực chính của dự án. Khi bổ sung module hoặc file mới, cần cập nhật README theo cấu trúc thực tế trong repository.

```text
shoe-store/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .npmrc
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
└── apps/
    ├── api/
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   ├── seed.ts
    │   │   └── migrations/
    │   ├── src/
    │   │   ├── config/
    │   │   │   └── prisma.ts
    │   │   ├── modules/
    │   │   │   ├── auth/
    │   │   │   ├── products/
    │   │   │   ├── catalog/
    │   │   │   ├── cart/
    │   │   │   ├── orders/
    │   │   │   └── customer/
    │   │   ├── app.ts
    │   │   └── server.ts
    │   ├── .env
    │   └── package.json
    └── web/
        ├── src/
        │   ├── components/
        │   ├── pages/
        │   ├── services/
        │   ├── types/
        │   ├── App.tsx
        │   └── main.tsx
        └── package.json
```

### Vai trò các thư mục

| Đường dẫn | Chức năng |
|---|---|
| `apps/web/src/pages/` | Các trang giao diện |
| `apps/web/src/components/` | Thành phần giao diện dùng chung |
| `apps/web/src/services/` | Hàm giao tiếp với backend |
| `apps/web/src/types/` | Kiểu dữ liệu phía frontend |
| `apps/api/src/modules/` | Các module nghiệp vụ và API |
| `apps/api/src/config/` | Cấu hình dùng chung, bao gồm Prisma Client |
| `apps/api/prisma/schema.prisma` | Định nghĩa model và quan hệ dữ liệu |
| `apps/api/prisma/migrations/` | Lịch sử thay đổi cấu trúc database |
| `apps/api/prisma/seed.ts` | Khởi tạo dữ liệu phục vụ phát triển và kiểm thử |
| `package.json` | Cấu hình workspace và script ở cấp repository |
| `package-lock.json` | Khóa dependency cho các workspace |
| `.github/workflows/ci.yml` | Quy trình kiểm tra tự động trên GitHub Actions |

## 👥 4. Phân công công việc

Nhóm gồm 6 thành viên. Mỗi thành viên chịu trách nhiệm chính cho một nhóm chức năng, bao gồm frontend và backend tương ứng. Các thành viên phối hợp với nhau khi cần thay đổi API, database hoặc tích hợp các luồng nghiệp vụ.

| Thành viên | Phạm vi phụ trách chính |
|---|---|
| **M1 — Nhóm trưởng** | Điều phối nhóm, Git/PR, review code, tích hợp hệ thống và cấu hình chung. Frontend: `ProductManagementPage`, `ProductForm`, `ProductTable`, `ProductListPage`. Backend: `products/`, `catalog/`. Phối hợp thống nhất dữ liệu sản phẩm và biến thể. |
| **M2 — Auth và Customer** | Frontend: đăng ký, đăng nhập, hồ sơ cá nhân, quản lý địa chỉ giao hàng và giao diện quản lý tài khoản Admin. Backend: `auth/`, `customer/`. Phụ trách JWT, RBAC và nhiều địa chỉ giao hàng. |
| **M3 — Product Detail, Cart và Promotions** | Frontend: `ProductDetailPage`, `CartPage`, `PromotionManagementPage`. Backend: `cart/`, `promotions/`. Phụ trách chi tiết sản phẩm, chọn size/màu, giỏ hàng, quản lý khuyến mãi và kiểm tra điều kiện áp dụng mã giảm giá. |
| **M4 — Checkout và Orders** | Frontend: `CheckoutPage`, `OrderHistoryPage`, `OrderManagementPage`. Backend: `orders/`. Phụ trách đặt hàng, lưu thông tin địa chỉ giao hàng tại thời điểm đặt đơn, lịch sử đơn hàng và quy trình quản lý trạng thái đơn hàng. |
| **M5 — Inventory** | Frontend: giao diện quản lý kho, nhập/xuất và kiểm kê. Backend: `inventory/`. Phụ trách tồn kho theo biến thể size/màu, cập nhật số lượng và phối hợp kiểm soát tồn kho trong quá trình đặt hàng. |
| **M6 — Payments và Dashboard** | Frontend: giao diện kết quả thanh toán và Dashboard. Backend: `payments/`, `dashboard/`. Phụ trách tích hợp **một cổng thanh toán sandbox** (VNPay, MoMo hoặc PayOS), xác minh kết quả thanh toán và thống kê đơn hàng, doanh thu. |

### Nguyên tắc phối hợp

- M1 điều phối và review Pull Request; các thành viên chủ động phát triển, kiểm thử module được giao.
- Mọi thay đổi ảnh hưởng đến `schema.prisma`, API contract hoặc cấu hình chung phải được trao đổi trước khi thực hiện.
- M1, M3 và M5 thống nhất dữ liệu sản phẩm, biến thể và tồn kho.
- M3 và M4 thống nhất cách tính tổng tiền, áp dụng khuyến mãi và dữ liệu chuyển sang checkout.
- M4 và M6 thống nhất trạng thái đơn hàng và thanh toán.
- Mỗi thành viên làm việc trên nhánh riêng, tạo Pull Request và kiểm tra CI trước khi tích hợp vào nhánh chung.

### Nguyên tắc phân công

- Người phụ trách chính chịu trách nhiệm triển khai, tự kiểm thử và bàn giao chức năng.
- Nhóm trưởng quản lý tích hợp và hỗ trợ giải quyết xung đột, không phải tự viết toàn bộ code của các thành viên.
- Các chức năng giao nhau như giỏ hàng, tồn kho, khuyến mãi, checkout và thanh toán phải thống nhất nghiệp vụ trước khi triển khai.
- Phân công cụ thể frontend, backend và database nên được quản lý bằng các thẻ Trello để tránh trùng việc.

## 🗃️ 5. Quy định quản lý file dùng chung

Các file dùng chung có thể ảnh hưởng đến nhiều chức năng, vì vậy cần thống nhất trước khi thay đổi.

| File hoặc khu vực | Người điều phối | Quy định |
|---|---|---|
| `docker-compose.yml` | Người 1 | Thống nhất tên service, cổng và cấu hình database |
| `apps/web/src/App.tsx` | Người 1 | Điều phối route và tích hợp trang |
| `apps/api/src/app.ts` | Người 1 | Đăng ký middleware và route |
| `apps/api/src/server.ts` | Người 1 | Quản lý khởi động server và cổng chạy |
| `apps/api/prisma/schema.prisma` | Người 1 điều phối | Thống nhất model, trường dữ liệu và quan hệ |
| `apps/api/prisma/migrations/` | Người được nhóm giao | Kiểm soát lịch sử thay đổi database |
| `apps/api/prisma/seed.ts` | Người 1 điều phối | Đồng bộ dữ liệu khởi tạo với schema |
| `package.json`, `package-lock.json` | Người 1 điều phối | Kiểm soát dependency và script dùng chung |
| `.github/workflows/ci.yml` | Người 1 điều phối | Duy trì quy trình CI |
| `.env.example` | Các thành viên phối hợp | Thống nhất tên biến môi trường, không chứa bí mật thật |

### Quy trình thay đổi database

1. Thành viên xác định nhu cầu dữ liệu từ nghiệp vụ.
2. Đề xuất model, trường dữ liệu, kiểu dữ liệu, quan hệ và ràng buộc.
3. Thống nhất với người điều phối database trước khi triển khai.
4. Cập nhật `schema.prisma` và tạo migration theo quy ước của nhóm.
5. Kiểm tra thay đổi trên database phát triển và các chức năng liên quan.
6. Đưa schema, migration và code liên quan vào cùng Pull Request khi phù hợp.

Không tự ý thay đổi schema hoặc tạo migration xung đột với thành viên khác. Không xóa migration đã được nhóm sử dụng chỉ để xử lý lỗi cục bộ.

## 🔌 6. Quy ước API

API sử dụng tiền tố `/api`. Các đường dẫn dưới đây là định hướng tổ chức, cần được đối chiếu với router và code backend trước khi sử dụng trong frontend.

| Chức năng | Đường dẫn định hướng | Ví dụ |
|---|---|---|
| Xác thực | `/api/auth` | `POST /api/auth/login` |
| Sản phẩm | `/api/products` | `GET /api/products` |
| Danh mục | `/api/catalog` | `GET /api/catalog` |
| Giỏ hàng | `/api/cart` | `GET /api/cart` |
| Khuyến mãi | `/api/promotions` | Kiểm tra và áp dụng mã giảm giá |
| Đơn hàng | `/api/orders` | Tạo và truy vấn đơn hàng |
| Khách hàng | `/api/customer` | Hồ sơ và địa chỉ giao hàng |
| Thanh toán | Theo API contract được thống nhất | Tạo yêu cầu và xác nhận kết quả thanh toán |

Không tự ý đổi URL, tên trường, kiểu dữ liệu hoặc định dạng response khi frontend và backend đang tích hợp.

### 6.1. Quy tắc giao tiếp frontend/backend

- Frontend gọi API thông qua các file trong `services/`.
- Kiểu dữ liệu trao đổi được khai báo trong `types/`.
- Thống nhất phương thức HTTP, tham số, request body, response và lỗi trước khi tích hợp.
- Backend kiểm tra dữ liệu đầu vào và quyền truy cập.
- Khi thay đổi API contract, phải thông báo cho các thành viên bị ảnh hưởng.

### 6.2. Các nghiệp vụ cần thống nhất

**Giỏ hàng và checkout**

- Giỏ hàng quản lý sản phẩm được chọn và số lượng.
- Checkout kiểm tra lại giá, tồn kho, địa chỉ và điều kiện khuyến mãi trước khi tạo đơn.
- Giá tiền cuối cùng phải được tính hoặc xác nhận tại backend.

**Khuyến mãi**

- Xác định thời hạn, điều kiện áp dụng, mức giảm và giới hạn sử dụng.
- Backend phải kiểm tra lại mã khuyến mãi khi đặt hàng.
- Không tin số tiền giảm giá do frontend tự gửi lên.

**Tồn kho**

- Kiểm tra số lượng tồn kho trước khi xác nhận đơn.
- Thiết kế cập nhật tồn kho để hạn chế bán vượt số lượng khi có nhiều yêu cầu đồng thời.
- Thống nhất thời điểm giữ, trừ hoặc hoàn tồn kho khi đơn hàng bị hủy.

**Thanh toán trực tuyến**

- Sử dụng môi trường sandbox hoặc môi trường thử nghiệm của nhà cung cấp phù hợp.
- Không lưu thông tin bí mật thanh toán trong mã nguồn frontend.
- Backend phải xác minh kết quả thanh toán từ nguồn đáng tin cậy.
- Không đánh dấu đơn hàng là đã thanh toán chỉ dựa vào thông báo từ giao diện.
- Thống nhất cách xử lý thanh toán thất bại, hủy giao dịch và thông báo lặp.

### 6.3. Bảo mật

- Mật khẩu phải được băm trước khi lưu.
- JWT secret và thông tin kết nối database không được đưa lên GitHub.
- Kiểm tra quyền truy cập ở backend, không chỉ ẩn nút trên giao diện.
- Người dùng chỉ được xem hoặc sửa dữ liệu thuộc phạm vi quyền của mình.
- Kiểm tra dữ liệu đầu vào và xử lý lỗi tại backend.
- Không tin giá, số tiền giảm hoặc tồn kho do frontend gửi lên.

## 🌿 7. Quy trình Git và Pull Request

### 7.1. Nguyên tắc

- Không làm việc trực tiếp trên `main`.
- Không mặc định push trực tiếp lên `dev` nếu repository yêu cầu Pull Request.
- Mỗi thành viên làm việc trên branch riêng theo chức năng.
- Tạo Pull Request vào nhánh tích hợp đã thống nhất.
- Chờ review và các status check bắt buộc trước khi merge.
- Không tự ý ghi đè code của thành viên khác khi giải quyết conflict.

### 7.2. Tên branch và commit

Ví dụ tên branch:

```text
feature/auth
feature/products
feature/catalog
feature/cart-promotion
feature/checkout-orders
feature/inventory
feature/payment
fix/rolldown-ci
```

Ví dụ commit:

```text
feat(auth): add login
feat(products): add product management
feat(catalog): add product search
feat(cart): add promotion support
feat(orders): implement checkout
feat(payment): integrate sandbox payment
fix(ci): resolve frontend build issue
```

### 7.3. Quy trình làm việc

1. Đồng bộ nhánh nền theo quy ước nhóm.
2. Tạo branch riêng cho công việc.
3. Code và kiểm thử trên máy.
4. Chạy các lệnh kiểm tra cần thiết.
5. Commit những thay đổi liên quan trực tiếp đến nhiệm vụ.
6. Push branch và tạo Pull Request.
7. Xử lý review và chờ CI.
8. Merge theo quy định repository.

Không sử dụng việc bypass branch protection như quy trình làm việc thông thường.

## ⚙️ 8. Cài đặt và chạy dự án

### 8.1. Yêu cầu môi trường

Cần cài đặt:

- Node.js phiên bản 24.x theo môi trường nhóm đã thống nhất.
- npm đi kèm hoặc phiên bản tương thích với lockfile.
- Git.
- Docker Desktop nếu sử dụng PostgreSQL qua Docker.
- Các dependency được khai báo trong repository.

Kiểm tra:

```powershell
node -v
npm -v
git --version
docker --version
docker compose version
```

Nếu sử dụng PostgreSQL cài trực tiếp trên máy, cần bảo đảm dịch vụ PostgreSQL đang chạy và có thông tin kết nối phù hợp.

### 8.2. Clone và cài dependency

Clone repository và chuyển vào thư mục dự án:

```powershell
git clone <URL_REPOSITORY>
cd shoe-store
```

Cài dependency tại thư mục gốc:

```powershell
npm ci --include=optional
```

**Không cần chạy `npm install` riêng trong `apps/api` và `apps/web` theo quy trình mặc định của monorepo.** Cài từ thư mục gốc giúp npm sử dụng lockfile chung.

Nếu `npm ci` báo lỗi, cần xử lý nguyên nhân trước thay vì xóa lockfile hoặc tự ý cài các phiên bản khác nhau.

### 8.3. Khởi chạy PostgreSQL

Tại thư mục gốc:

```powershell
docker compose up -d
```

Kiểm tra container:

```powershell
docker compose ps
```

Xem log nếu cần:

```powershell
docker compose logs -f
```

Cổng kết nối, tên database, username và password phải khớp với cấu hình trong `docker-compose.yml` và `DATABASE_URL`.

Nếu sử dụng PostgreSQL cài trực tiếp trên máy, có thể không cần Docker. Tuy nhiên, phải bảo đảm database và thông tin kết nối tương thích với dự án.

### 8.4. Cấu hình môi trường

Backend cần file `apps/api/.env` với các biến phù hợp với code hiện tại.

Ví dụ minh họa:

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/shoe_store?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
```

Đây là giá trị minh họa, không phải thông tin xác thực thật của nhóm. Cần thay bằng cấu hình thực tế.

Frontend có thể cần file `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

Tên biến phải khớp với code frontend. Với Vite, biến môi trường được sử dụng ở frontend thường có tiền tố `VITE_`. Không đặt JWT secret hoặc mật khẩu database trong biến `VITE_`.

Nhóm cần duy trì `.env.example` cho từng ứng dụng nếu cần, chỉ chứa tên biến và giá trị mẫu không nhạy cảm. Không commit file `.env` cá nhân lên GitHub.

### 8.5. Khởi tạo database

Sau khi PostgreSQL đã chạy và `DATABASE_URL` đã được cấu hình, chuyển vào thư mục API:

```powershell
cd apps/api
```

Generate Prisma Client:

```powershell
npx prisma generate
```

Đối với database phát triển mới, nếu quy trình hiện tại của nhóm sử dụng `db push`:

```powershell
npx prisma db push
```

Chạy seed theo script đã khai báo trong `apps/api/package.json`:

```powershell
npm run seed
```

> Nếu repository đã quản lý migration bằng `prisma migrate`, hãy làm theo quy trình migration của nhóm thay vì tự ý dùng `db push` để thay thế. Không chạy các lệnh xóa hoặc reset database trên dữ liệu quan trọng.

Quay lại thư mục gốc sau khi hoàn tất:

```powershell
cd ../..
```

### 8.6. Chạy backend và frontend

Mở hai terminal riêng.

**Terminal 1 — Backend**

```powershell
npm --workspace=apps/api run dev
```

**Terminal 2 — Frontend**

```powershell
npm --workspace=apps/web run dev
```

Các lệnh trên yêu cầu workspace tương ứng đã khai báo script `dev`. Nếu script trong `package.json` khác, sử dụng script thực tế của dự án.

Mở địa chỉ local do Vite thông báo trong terminal. Nếu frontend không lấy được dữ liệu, kiểm tra backend, `VITE_API_URL`, CORS và trạng thái database.

### 8.7. Các lệnh Docker thường dùng

| Lệnh | Ý nghĩa |
|---|---|
| `docker compose up -d` | Khởi chạy dịch vụ ở chế độ nền |
| `docker compose ps` | Xem trạng thái container |
| `docker compose logs -f` | Theo dõi log |
| `docker compose stop` | Dừng dịch vụ nhưng giữ container |
| `docker compose down` | Dừng và xóa container của Compose |
| `docker compose down -v` | Xóa cả volume; có thể làm mất dữ liệu database |

**Cẩn thận với `docker compose down -v`:** chỉ sử dụng khi chủ động muốn xóa dữ liệu phát triển và đã xác nhận không cần giữ dữ liệu.

## 🧪 9. Kiểm thử và CI

### 9.1. Kiểm thử chức năng

Mỗi thành viên cần kiểm tra:

- Dữ liệu hợp lệ.
- Dữ liệu thiếu hoặc không hợp lệ.
- Trường hợp không tìm thấy dữ liệu.
- Người dùng chưa đăng nhập hoặc không đủ quyền.
- Lỗi kết nối API hoặc database.
- Tình huống dữ liệu thay đổi ảnh hưởng chức năng khác.
- Các trường hợp nghiệp vụ đặc biệt như tồn kho không đủ, mã giảm giá hết hạn hoặc thanh toán thất bại.

### 9.2. GitHub Actions

Workflow tại `.github/workflows/ci.yml` chạy các bước được khai báo, có thể bao gồm:

- Cài dependency từ lockfile.
- Generate Prisma Client.
- Khởi tạo database kiểm thử.
- Kiểm tra seed.
- Build backend.
- Chạy ESLint và build frontend.

Chỉ những bước có trong workflow thực tế mới được xem là đã tự động hóa.

Trước khi merge Pull Request, cần kiểm tra các status check bắt buộc đã thành công. Build trên máy cá nhân không thay thế được việc kiểm tra CI trên môi trường GitHub Actions.

Nếu CI báo lỗi dependency native trên Linux, cần kiểm tra phiên bản package, lockfile và cấu hình cài dependency thay vì mặc định lỗi nằm trong code React.

## ✅ 10. Điều kiện hoàn thành một chức năng

Một chức năng được xem là hoàn thành khi:

1. Giao diện hoạt động đúng.
2. API xử lý đúng nghiệp vụ.
3. Dữ liệu được lưu và truy xuất đúng.
4. Backend kiểm tra dữ liệu đầu vào và quyền truy cập.
5. Có xử lý lỗi phù hợp.
6. Đã kiểm thử các trường hợp chính và trường hợp lỗi.
7. Không làm hỏng chức năng liên quan.
8. Các bước build, lint hoặc kiểm tra tương ứng đều đạt.
9. Có mô tả ngắn để thành viên khác kiểm tra.
10. Pull Request được review và merge theo quy định nhóm.

## 📅 11. Kế hoạch triển khai trong 4 tuần

| Thời gian | Mục tiêu | Công việc chính |
|---|---|---|
| **Tuần 1 — Hoàn thiện nền tảng** | Thống nhất cấu trúc và hợp đồng API | Cấu hình môi trường; thống nhất database, API contract; kiểm tra seed; chốt phân công; hoàn thiện các chức năng nền tảng và quy trình Git/CI. |
| **Tuần 2 — Phát triển chức năng** | Hoàn thiện các module chính | Phát triển xác thực, sản phẩm, danh mục, tồn kho, hồ sơ khách hàng, nhiều địa chỉ giao hàng, giỏ hàng và khuyến mãi. |
| **Tuần 3 — Đặt hàng và tích hợp** | Hoàn thiện các luồng nghiệp vụ bắt buộc | Tích hợp checkout, tạo đơn hàng, kiểm tra tồn kho, áp dụng khuyến mãi, thanh toán trực tuyến sandbox và quản lý trạng thái đơn hàng. |
| **Tuần 4 — Kiểm thử và hoàn thiện** | Ổn định hệ thống và chuẩn bị bảo vệ | Kiểm thử toàn bộ luồng mua hàng; sửa lỗi; kiểm tra quyền truy cập; kiểm thử hồi quy; xác nhận CI; hoàn thiện giao diện, README, báo cáo và demo. |

### Nguyên tắc triển khai trong 4 tuần

- **Cuối tuần 1:** chốt schema và API contract để hạn chế thay đổi ảnh hưởng lẫn nhau.
- **Cuối tuần 2:** các module chính phải có phiên bản hoạt động để bắt đầu tích hợp.
- **Cuối tuần 3:** hoàn thành luồng mua hàng từ giỏ hàng đến kết quả thanh toán sandbox.
- **Tuần 4:** ưu tiên sửa lỗi và hoàn thiện các chức năng bắt buộc; hạn chế bổ sung tính năng mới không cần thiết.

Các chức năng khuyến mãi, thanh toán trực tuyến và nhiều địa chỉ giao hàng phải có thẻ Trello riêng, người phụ trách và tiêu chí nghiệm thu cụ thể. Không để các chức năng này bị bỏ sót khi tích hợp.
## 📜 12. Quy ước chung

- Trao đổi trước khi sửa file dùng chung.
- Thống nhất API contract và kiểu dữ liệu trước khi tích hợp.
- Không tự ý đổi schema, endpoint hoặc cấu hình chung.
- Không commit thông tin bí mật.
- Không merge khi CI bắt buộc còn thất bại.
- Không bypass quy tắc branch protection như quy trình thông thường.
- Báo sớm khi có lỗi ảnh hưởng đến thành viên khác.
- Ưu tiên code dễ đọc, dễ kiểm thử và dễ giải thích khi bảo vệ đồ án.

---

## 🎯 Mục tiêu cuối cùng

Hoàn thành website bán giày dép có các luồng nghiệp vụ cốt lõi hoạt động ổn định: quản lý sản phẩm và tồn kho, giỏ hàng, khuyến mãi, nhiều địa chỉ giao hàng, đặt hàng, thanh toán trực tuyến và quản trị đơn hàng.

Toàn bộ hệ thống sử dụng PostgreSQL để quản lý dữ liệu, có frontend và backend kết nối với nhau, quy trình làm việc nhóm rõ ràng và các kiểm tra tự động phù hợp với phạm vi đồ án.
