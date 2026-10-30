
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

export function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API =
    import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  useEffect(() => {
    async function loadUsers() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Không tải được người dùng");

        setUsers(result.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi kết nối API");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email}`
      .toLowerCase()
      .includes(keyword.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <h2>Quản lý người dùng</h2>

      <input
        placeholder="Tìm theo tên hoặc email..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.role}</td>
                <td>{user.isActive ? "Hoạt động" : "Đã khóa"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

