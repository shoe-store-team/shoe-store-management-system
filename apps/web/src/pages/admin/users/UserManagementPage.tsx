import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./UserManagementPage.css";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

interface EditForm {
  name: string;
  email: string;
  phone: string;
  role: string;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Hàm gọi API
async function request(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Vui lòng đăng nhập lại.");
  }

  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Yêu cầu thất bại");
  }

  return result;
}

export function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<EditForm>({
    name: "",
    email: "",
    phone: "",
    role: "CUSTOMER",
  });

  // Tải danh sách người dùng
  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const result = await request("/users");

        if (!cancelled) {
          setUsers(result.data ?? []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Lỗi kết nối API",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tìm kiếm và lọc người dùng
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text =
        `${user.name} ${user.email} ${user.phone}`.toLowerCase();

      const matchKeyword = text.includes(keyword.toLowerCase());

      const matchRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "LOCKED" && !user.isActive);

      return matchKeyword && matchRole && matchStatus;
    });
  }, [users, keyword, roleFilter, statusFilter]);

  // Mở form chỉnh sửa
  function openEdit(user: User) {
    setMessage("");
    setEditingUser(user);

    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
  }

  // Lưu thông tin người dùng
  async function saveUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingUser || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const result = await request(`/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser.id ? result.data : user,
        ),
      );

      setEditingUser(null);
      setMessage("Cập nhật tài khoản thành công.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật",
      );
    } finally {
      setSaving(false);
    }
  }

  // Khóa hoặc mở khóa tài khoản
  async function toggleStatus(user: User) {
    const action = user.isActive ? "khóa" : "mở khóa";

    if (
      !window.confirm(
        `Bạn có chắc muốn ${action} ${user.email}?`,
      )
    ) {
      return;
    }

    setMessage("");

    try {
      const result = await request(`/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? result.data : item,
        ),
      );

      setMessage(`Đã ${action} tài khoản thành công.`);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái",
      );
    }
  }

  return (
    <div className="user-management">
      <div className="user-heading">
        <div>
          <h2>Quản lý người dùng</h2>
          <p>Quản lý tài khoản khách hàng và nhân viên kho</p>
        </div>

        <div className="user-count">
          {users.length} tài khoản
        </div>
      </div>

      <div className="user-toolbar">
        <input
          className="user-search"
          placeholder="⌕  Tìm theo tên, email hoặc số điện thoại..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="ALL">Tất cả vai trò</option>
          <option value="CUSTOMER">Khách hàng</option>
          <option value="WAREHOUSE_STAFF">
            Nhân viên kho
          </option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
      </div>

      {message && <p role="status">{message}</p>}

      {loading && (
        <p className="user-message">Đang tải dữ liệu...</p>
      )}

      {error && <p className="user-error">{error}</p>}

      {!loading && !error && (
        <div className="user-table-card">
          <div className="user-table-scroll">
            <table className="user-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <span>{user.name}</span>
                      </div>
                    </td>

                    <td>{user.email}</td>

                    <td>{user.phone || "—"}</td>

                    <td>
                      <span className="role-badge">
                        {user.role === "CUSTOMER"
                          ? "Khách hàng"
                          : user.role === "WAREHOUSE_STAFF"
                            ? "Nhân viên kho"
                            : user.role}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          user.isActive
                            ? "status-active"
                            : "status-locked"
                        }`}
                      >
                        {user.isActive
                          ? "● Hoạt động"
                          : "● Đã khóa"}
                      </span>
                    </td>

                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => openEdit(user)}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className="btn-lock"
                          onClick={() => void toggleStatus(user)}
                        >
                          {user.isActive ? "Khóa" : "Mở khóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="user-empty">
                      Không tìm thấy tài khoản phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="user-table-footer">
            Hiển thị {filteredUsers.length} / {users.length} tài khoản
          </div>
        </div>
      )}

      {editingUser && (
        <div className="user-modal-backdrop">
          <form className="user-modal" onSubmit={saveUser}>
            <h3>Sửa tài khoản</h3>

            <label>
              Họ tên
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </label>

            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </label>

            <label>
              Số điện thoại
              <input
                required
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
            </label>

            <label>
              Vai trò
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value })
                }
              >
                <option value="CUSTOMER">Khách hàng</option>
                <option value="WAREHOUSE_STAFF">
                  Nhân viên kho
                </option>
              </select>
            </label>

            <div className="user-actions">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="btn-edit"
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
