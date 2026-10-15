 
# 👟 SHOE STORE MANAGEMENT SYSTEM

Website thương mại điện tử bán giày dép kết hợp hệ thống quản lý cửa hàng, được phát triển bởi nhóm 6 thành viên.

Dự án áp dụng mô hình **Fullstack Monorepo**, trong đó frontend và backend được quản lý chung trong một repository nhưng được chia thành các thư mục riêng biệt. Các thành viên phụ trách từng chức năng từ giao diện, xử lý nghiệp vụ đến kết nối cơ sở dữ liệu.

## 📌 1. Mục tiêu dự án

Hệ thống hướng đến hai nhóm người dùng chính:

**Khách hàng**
- Xem danh sách và chi tiết sản phẩm.
- Tìm kiếm, lọc sản phẩm theo các tiêu chí phù hợp.
- Quản lý giỏ hàng và đặt hàng.
- Đăng ký, đăng nhập và quản lý thông tin cá nhân.
- Quản lý địa chỉ nhận hàng.
- Xem lịch sử mua hàng và trạng thái đơn hàng.

**Quản trị viên**
- Quản lý sản phẩm, danh mục, kích cỡ, màu sắc và tồn kho.
- Quản lý và cập nhật trạng thái đơn hàng.
- Theo dõi doanh thu và thống kê bán hàng.
- Quản lý quyền truy cập theo vai trò người dùng.

Phạm vi triển khai cuối cùng sẽ căn cứ vào yêu cầu đồ án và tiến độ thực tế của nhóm.

## 🛠️ 2. Công nghệ sử dụng

### 2.1. Frontend

| Công nghệ | Vai trò |
|---|---|
| React 19 | Xây dựng giao diện người dùng |
| Vite 8 | Khởi chạy môi trường phát triển và build ứng dụng |
| TypeScript | Kiểm tra kiểu dữ liệu và hỗ trợ phát triển |
| React Router DOM | Điều hướng giữa các trang |
| Fetch API | Gửi HTTP request đến backend |
| ESLint | Kiểm tra các vấn đề trong mã nguồn |

### 2.2. Backend

| Công nghệ | Vai trò |
|---|---|
| Node.js | Môi trường chạy JavaScript phía máy chủ |
| Express 5 | Xây dựng REST API |
| TypeScript | Kiểm tra kiểu dữ liệu phía backend |
| PostgreSQL | Lưu trữ dữ liệu hệ thống |
| Prisma ORM 6.19.3 | Truy vấn database và quản lý schema, migration |
| JSON Web Token (JWT) | Xác thực người dùng |
| bcryptjs | Băm mật khẩu trước khi lưu |
| CORS | Cấu hình quyền truy cập API giữa các origin |

### 2.3. Công cụ phát triển

- **Git và GitHub:** Quản lý mã nguồn, phân nhánh và hợp nhất code.
- **npm:** Cài đặt và quản lý thư viện.
- **GitHub Actions:** Tự động kiểm tra mã nguồn khi push hoặc tạo Pull Request.
- **PostgreSQL:** Có thể chạy trực tiếp trên máy hoặc trong Docker, tùy cấu hình nhóm thống nhất.

> **Lưu ý:** GitHub Actions hiện được sử dụng cho CI (Continuous Integration), tức kiểm tra tự động. Chỉ gọi là CI/CD khi dự án có thêm quy trình triển khai tự động phù hợp.

## 📂 3. Cấu trúc thư mục dự án

```text
shoe-store/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .npmrc
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
        │   │   ├── auth/
        │   │   ├── admin-products/
        │   │   ├── catalog/
        │   │   ├── checkout/
        │   │   ├── admin-orders/
        │   │   └── customer/
        │   ├── services/
        │   ├── types/
        │   ├── App.tsx
        │   └── main.tsx
        ├── .env
        └── package.json
```

*Đây là cấu trúc định hướng. Không tự tạo lại những file đã tồn tại hoặc di chuyển file nếu chưa thống nhất với nhóm.*

### Vai trò các thư mục chính

| Thư mục | Chức năng |
|---|---|
| `apps/web/src/pages/` | Các trang giao diện theo chức năng |
| `apps/web/src/components/` | Các thành phần giao diện dùng chung |
| `apps/web/src/services/` | Các hàm gọi API |
| `apps/web/src/types/` | Các kiểu dữ liệu TypeScript dùng ở frontend |
| `apps/api/src/modules/` | Các module xử lý nghiệp vụ và API |
| `apps/api/src/config/` | Cấu hình kết nối và các cấu hình dùng chung |
| `apps/api/prisma/schema.prisma` | Khai báo cấu trúc dữ liệu |
| `apps/api/prisma/migrations/` | Lịch sử thay đổi cấu trúc database |
| `apps/api/prisma/seed.ts` | Dữ liệu mẫu phục vụ phát triển và kiểm thử |

## 👥 4. Phân công công việc cho 6 thành viên

Mỗi thành viên chịu trách nhiệm chính cho một nhóm chức năng, bao gồm frontend, backend và kiểm thử chức năng được giao.

| Thành viên | Chức năng | Frontend | Backend |
|---|---|---|---|
| **Người 1 — Nhóm trưởng** | Đăng ký, đăng nhập, phân quyền và tích hợp | `pages/auth/`, `services/authService.ts`, `types/auth.ts` | `modules/auth/` |
| **Người 2** | Quản lý sản phẩm, biến thể và tồn kho | `pages/admin-products/`, `services/productService.ts`, `types/product.ts` | `modules/products/` |
| **Người 3** | Trang chủ, danh mục, tìm kiếm, lọc và chi tiết sản phẩm | `pages/catalog/`, `services/catalogService.ts`, `types/catalog.ts` | `modules/catalog/` |
| **Người 4** | Giỏ hàng, kiểm tra tồn kho và tạo đơn hàng | `pages/checkout/`, `services/cartService.ts`, `types/cart.ts` | `modules/cart/` và phần tạo đơn đã thống nhất |
| **Người 5** | Quản lý đơn hàng, cập nhật trạng thái và thống kê doanh thu | `pages/admin-orders/`, `services/orderService.ts`, `types/order.ts` | `modules/orders/` |
| **Người 6** | Hồ sơ, địa chỉ nhận hàng và lịch sử mua hàng | `pages/customer/`, `services/customerService.ts`, `types/customer.ts` | `modules/customer/` |

### 4.1. Trách nhiệm của từng thành viên

**Người 1 — Nhóm trưởng**
- Phụ trách chức năng xác thực và phân quyền.
- Duy trì cấu trúc chung, tích hợp các route và kiểm tra toàn hệ thống.
- Tổng hợp đề xuất thay đổi database từ các thành viên.
- Quản lý những file dùng chung theo quy ước tại mục 5.
- Không phải tự viết toàn bộ chức năng của các thành viên khác.

**Người 2 đến Người 6**
- Phát triển chức năng được giao trong thư mục phụ trách.
- Thống nhất kiểu dữ liệu, API và quan hệ database với các thành viên liên quan.
- Tự kiểm thử chức năng trước khi tạo Pull Request.
- Thông báo sớm nếu cần thay đổi file dùng chung hoặc ảnh hưởng đến chức năng khác.

## 🗃️ 5. Quy định quản lý file dùng chung

Một số file ảnh hưởng đến toàn hệ thống nên cần được kiểm soát chặt chẽ để tránh xung đột.

| File hoặc khu vực | Người phụ trách chính | Quy định |
|---|---|---|
| `apps/web/src/App.tsx` | Người 1 | Quản lý route frontend và tích hợp trang |
| `apps/api/src/app.ts` | Người 1 | Đăng ký các route backend |
| `apps/api/src/server.ts` | Người 1 | Quản lý khởi động server và cổng chạy |
| `apps/api/prisma/schema.prisma` | Người 1 điều phối | Các thành viên đề xuất trường dữ liệu; thống nhất trước khi sửa |
| `apps/api/prisma/migrations/` | Người 1 điều phối | Thống nhất và kiểm soát việc tạo, áp dụng migration |
| `apps/api/prisma/seed.ts` | Người 1 điều phối | Tổng hợp dữ liệu mẫu theo schema đã thống nhất |
| Cấu hình môi trường | Người 1 điều phối | Không tự ý đổi tên biến môi trường dùng chung |
| `package.json`, lockfile và CI | Người 1 điều phối | Thống nhất khi thay đổi thư viện hoặc script |
| `apps/web/src/components/` | Người được nhóm giao | Thành phần dùng chung phải trao đổi trước khi thay đổi giao diện hoặc API props |

### Quy trình thay đổi database

1. Thành viên xác định dữ liệu mà chức năng của mình cần.
2. Gửi đề xuất tên bảng, trường dữ liệu, kiểu dữ liệu, quan hệ và ràng buộc cho nhóm trưởng.
3. Nhóm thống nhất thiết kế database trước khi code phụ thuộc vào dữ liệu đó.
4. Người được phân công thực hiện thay đổi `schema.prisma` và tạo migration.
5. Chạy migration trên database phát triển, kiểm tra các chức năng bị ảnh hưởng.
6. Đưa các thay đổi liên quan vào Pull Request để nhóm kiểm tra.

**Không tự ý chỉnh schema hoặc tạo nhiều migration độc lập cùng lúc.** Nếu cần thay đổi gấp, phải trao đổi với người đang quản lý database trước.

## 🔌 6. Quy ước thiết kế API

Các API sử dụng tiền tố `/api`. Mỗi nhóm chức năng có một đường dẫn gốc riêng.

| Chức năng | Đường dẫn gốc | Ví dụ endpoint |
|---|---|---|
| Xác thực | `/api/auth` | `POST /api/auth/login`, `POST /api/auth/register` |
| Quản lý sản phẩm | `/api/products` | `GET /api/products`, `POST /api/products` |
| Danh mục sản phẩm | `/api/catalog` | `GET /api/catalog`, `GET /api/catalog/:id` |
| Giỏ hàng | `/api/cart` | `GET /api/cart`, `POST /api/cart/items` |
| Đơn hàng | `/api/orders` | `GET /api/orders`, `PATCH /api/orders/:id/status` |
| Khách hàng | `/api/customer` | `GET /api/customer/profile`, `GET /api/customer/orders` |

Đây là các endpoint định hướng. Nhóm cần thống nhất request, response và quyền truy cập trước khi frontend gọi API. Nếu dự án đã triển khai endpoint khác, hãy cập nhật bảng này theo code thực tế thay vì đổi URL hàng loạt.

### 6.1. Quy tắc giao tiếp giữa frontend và backend

- Frontend gọi API thông qua file trong `services/`, không viết các request rải rác trong nhiều component.
- Các kiểu dữ liệu trao đổi được khai báo trong `types/`.
- Không tự ý đổi URL, tên trường, kiểu dữ liệu hoặc định dạng response khi thành viên khác đang sử dụng.
- Mỗi API cần thống nhất phương thức HTTP, tham số, dữ liệu đầu vào, dữ liệu trả về và lỗi có thể xảy ra.
- Khi API thay đổi, người phụ trách phải thông báo cho các thành viên liên quan.

### 6.2. Phân biệt giỏ hàng và tạo đơn

- **Giỏ hàng:** Thêm, sửa số lượng, xóa sản phẩm và xem các mặt hàng đã chọn.
- **Checkout:** Kiểm tra dữ liệu đặt hàng, địa chỉ nhận hàng, giá và số lượng tồn kho trước khi tạo đơn.
- **Quản lý đơn hàng:** Xem danh sách đơn và cập nhật trạng thái theo quyền của quản trị viên.
- **Lịch sử mua hàng:** Khách hàng chỉ được xem đơn hàng thuộc tài khoản của mình.

Nếu nhóm quyết định tạo đường dẫn riêng `/api/checkout`, cần thống nhất với Người 4 và Người 5 trước khi triển khai. Không để hai module cùng xử lý việc tạo một đơn hàng theo hai cách khác nhau.

### 6.3. Quy tắc bảo mật và dữ liệu

- Kiểm tra dữ liệu đầu vào tại backend.
- Kiểm tra quyền truy cập ở backend, không chỉ ẩn nút trên giao diện.
- Mật khẩu phải được băm trước khi lưu; không lưu mật khẩu dạng văn bản thuần.
- Giá tiền và tồn kho phải được xác minh ở backend, không tin giá do frontend gửi lên.
- Người dùng không được tự ý truy cập hồ sơ hoặc đơn hàng của tài khoản khác.
- Việc tạo đơn và cập nhật tồn kho phải được thiết kế để hạn chế sai lệch dữ liệu khi nhiều yêu cầu xảy ra gần nhau.
- Không đưa JWT secret, mật khẩu database hoặc thông tin bí mật vào mã nguồn công khai.

## 🌿 7. Quy ước Git và GitHub

### 7.1. Nguyên tắc làm việc

- Không commit trực tiếp lên nhánh `main`.
- Mỗi thành viên làm việc trên nhánh riêng theo chức năng.
- Tạo Pull Request để nhóm trưởng hoặc người được phân công review.
- Chỉ merge khi code đã được kiểm tra và không làm hỏng chức năng hiện có.
- Không ghi đè hoặc xóa code của thành viên khác khi xử lý xung đột nếu chưa trao đổi.

### 7.2. Đặt tên nhánh

Ví dụ:

```text
feature/auth
feature/products
feature/catalog
feature/cart-checkout
feature/admin-orders
feature/customer-profile
fix/product-validation
```

Tên nhánh có thể điều chỉnh theo quy ước nhóm, nhưng cần thể hiện rõ mục đích thay đổi.

### 7.3. Quy trình làm việc đề xuất

1. Đồng bộ nhánh nền mà nhóm đang sử dụng.
2. Tạo nhánh riêng cho chức năng.
3. Code và tự kiểm thử trên máy.
4. Commit những thay đổi liên quan trực tiếp đến công việc.
5. Push nhánh lên GitHub.
6. Tạo Pull Request vào nhánh tích hợp mà nhóm đã thống nhất.
7. Chờ review và sửa các vấn đề được góp ý.
8. Chỉ merge sau khi các kiểm tra cần thiết đạt yêu cầu.

Ví dụ commit:

```text
feat(auth): add login form
feat(products): add product management
feat(catalog): add product search
feat(cart): add cart item management
fix(orders): validate order status
```

**Lưu ý:** Nhóm cần thống nhất rõ nhánh tích hợp là `dev` hay `main`. Không mặc định merge tất cả Pull Request vào `main` nếu nhóm đang sử dụng `dev` để tích hợp.

## ⚙️ 8. Cài đặt và chạy dự án

### 8.1. Yêu cầu môi trường

Cần cài đặt:

- Node.js và npm tương thích với dự án.
- PostgreSQL đang chạy và có database dành cho dự án.
- Git.
- Các thư viện được khai báo trong `package.json`.

Có thể kiểm tra môi trường bằng:

```bash
node -v
npm -v
git --version
```

Nếu dùng PostgreSQL cài trực tiếp trên máy, cần biết host, port, tên database, username và password đã cấu hình. Không bắt buộc phải sử dụng Docker nếu PostgreSQL đã chạy ổn định theo cách này.

### 8.2. Cài đặt thư viện

Tại thư mục gốc dự án:

```bash
npm install
```

Nếu repository đã có `package-lock.json` và cấu hình hỗ trợ cài đặt từ lockfile, có thể sử dụng `npm ci` để cài đặt theo đúng phiên bản đã khóa.

Nếu dự án quản lý package riêng trong từng ứng dụng, hãy thực hiện theo các script và cấu hình thực tế trong `package.json` của repository.

### 8.3. Cấu hình môi trường

Backend cần cấu hình thông tin kết nối database và các biến bí mật trong file `.env` của ứng dụng API.

Ví dụ minh họa:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/shoe_store?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
```

Thay `USER`, `PASSWORD`, tên database và port bằng thông tin PostgreSQL thực tế của máy.

Frontend có thể cần biến môi trường để xác định địa chỉ API, ví dụ:

```env
VITE_API_URL=http://localhost:3000/api
```

Tên biến và cách đọc biến môi trường phải khớp với code hiện tại. Với Vite, các biến đưa vào frontend thường có tiền tố `VITE_`; không đặt mật khẩu database hoặc JWT secret trong biến môi trường frontend.

File `.env` chứa thông tin riêng của từng máy không được commit lên GitHub. Nhóm nên cung cấp file `.env.example` chỉ chứa giá trị mẫu không nhạy cảm.

### 8.4. Khởi tạo database

Sau khi tạo database PostgreSQL và cấu hình `DATABASE_URL`:

1. Kiểm tra `schema.prisma` có cấu hình tương thích với phiên bản Prisma của dự án.
2. Cài đặt/generate Prisma Client theo script đã cấu hình.
3. Áp dụng các migration của dự án lên database phát triển.
4. Chạy seed nếu dự án có dữ liệu mẫu.
5. Kiểm tra database trước khi khởi chạy backend.

Các lệnh Prisma thường dùng trong môi trường phát triển:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Các lệnh trên là ví dụ phổ biến; cần chạy từ đúng thư mục ứng dụng API và kiểm tra `package.json`, phiên bản Prisma cũng như cấu hình seed của repository trước khi sử dụng. Không chạy migration mới một cách tùy tiện nếu nhóm đã có migration được chia sẻ.

### 8.5. Khởi chạy ứng dụng

Chạy backend và frontend trong hai terminal riêng.

**Terminal 1 — Backend**

```bash
cd apps/api
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd apps/web
npm run dev
```

Các lệnh trên giả định mỗi ứng dụng đã khai báo script `dev`. Nếu script thực tế khác, hãy dùng lệnh tương ứng trong `package.json`.

Sau khi khởi chạy, mở địa chỉ local mà Vite thông báo trong terminal. Đảm bảo backend đang chạy, database kết nối thành công và frontend trỏ đúng địa chỉ API.

## 🧪 9. Kiểm thử và kiểm tra chất lượng

Mỗi thành viên chịu trách nhiệm kiểm tra chức năng của mình trước khi bàn giao.

### 9.1. Kiểm tra chức năng

Tùy theo chức năng, cần kiểm tra:

- Trường hợp dữ liệu hợp lệ.
- Trường hợp dữ liệu thiếu hoặc không hợp lệ.
- Trường hợp không tìm thấy dữ liệu.
- Trường hợp người dùng chưa đăng nhập hoặc không đủ quyền.
- Trường hợp API hoặc database xảy ra lỗi.
- Trường hợp dữ liệu thay đổi có ảnh hưởng đến chức năng khác.

### 9.2. Kiểm tra tự động

Dự án sử dụng GitHub Actions để chạy các bước kiểm tra đã được cấu hình trong `.github/workflows/ci.yml`, chẳng hạn:

- Build frontend và backend.
- Kiểm tra TypeScript.
- Chạy ESLint.

Chỉ những bước thực sự được khai báo trong file workflow mới được xem là đã tự động hóa. Thành viên cần kiểm tra kết quả CI trước khi merge Pull Request.

## ✅ 10. Điều kiện hoàn thành một chức năng

Một chức năng được xem là hoàn thành khi:

1. Giao diện hiển thị và hoạt động đúng.
2. API thực hiện đúng nghiệp vụ.
3. Dữ liệu được lưu và truy xuất từ database khi cần.
4. Dữ liệu đầu vào được kiểm tra ở backend.
5. Quyền truy cập được kiểm tra đúng.
6. Có xử lý lỗi và thông báo phù hợp.
7. Không làm hỏng các chức năng đã tích hợp.
8. Các bước build, TypeScript và lint liên quan đều đạt.
9. Có hướng dẫn hoặc mô tả ngắn để thành viên khác kiểm tra chức năng.
10. Pull Request đã được review và merge theo quy trình của nhóm.

## 📅 11. Kế hoạch triển khai trong 5 tuần

| Thời gian | Mục tiêu |
|---|---|
| **Tuần 1** | Thống nhất nghiệp vụ, database, API contract, môi trường và phân công |
| **Tuần 2** | Phát triển các chức năng chính theo từng module; kết nối frontend với API |
| **Tuần 3** | Hoàn thiện CRUD, luồng giỏ hàng và đặt hàng, xác thực và phân quyền |
| **Tuần 4** | Tích hợp toàn hệ thống, sửa lỗi, kiểm thử các luồng liên quan |
| **Tuần 5** | Ổn định sản phẩm, hoàn thiện báo cáo, chuẩn bị demo và kiểm tra triển khai |

Kế hoạch có thể điều chỉnh theo yêu cầu của giảng viên. Ưu tiên hoàn thành các luồng nghiệp vụ bắt buộc trước, sau đó mới bổ sung tính năng nâng cao.

## 📜 12. Quy ước chung của nhóm

- Trao đổi trước khi sửa file dùng chung.
- Thống nhất API và kiểu dữ liệu trước khi hai bên frontend/backend tích hợp.
- Không tự ý đổi cấu trúc database, route hoặc cấu hình chung.
- Không commit thông tin bí mật hoặc file môi trường cá nhân.
- Không merge code chưa kiểm tra.
- Khi gặp lỗi ảnh hưởng đến thành viên khác, cần thông báo sớm và cung cấp thông tin lỗi cụ thể.
- Ưu tiên code rõ ràng, dễ đọc và dễ giải thích khi bảo vệ đồ án.

---

**Mục tiêu cuối cùng:** Hoàn thành một website bán giày dép có các chức năng cốt lõi hoạt động thực tế, dữ liệu được quản lý bằng PostgreSQL, frontend và backend kết nối ổn định, đồng thời tất cả thành viên đều hiểu và giải thích được phần mình phụ trách.
