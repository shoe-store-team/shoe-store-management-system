import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { customerService } from "../../services/customerService";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

type Address = {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault: boolean;
};

const emptyAddress = {
  recipientName: "",
  phone: "",
  addressLine: "",
  ward: "",
  district: "",
  province: "",
  isDefault: false,
};

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressForm, setAddressForm] = useState({ ...emptyAddress });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [profileRes, addressRes] = await Promise.all([
      customerService.getProfile(),
      customerService.getAddresses(),
    ]);

    const p = profileRes.data ?? profileRes;
    const a = addressRes.data ?? addressRes;

    if (!p || !Array.isArray(a)) {
      throw new Error("Dữ liệu hồ sơ không hợp lệ");
    }

    setProfile(p as Profile);
    setName(p.name);
    setPhone(p.phone);
    setAddresses(a as Address[]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        await loadData();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Không tải được dữ liệu",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  async function updateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      const result = await customerService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });

      const updated = result.data ?? result;
      setProfile(updated as Profile);
      setName(updated.name);
      setPhone(updated.phone);
      setMessage("Cập nhật hồ sơ thành công");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditAddress(address: Address) {
    setEditingId(address.id);
    setAddressForm({
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine: address.addressLine,
      ward: address.ward ?? "",
      district: address.district ?? "",
      province: address.province ?? "",
      isDefault: address.isDefault,
    });
    setError("");
    setMessage("");
  }

  function resetAddressForm() {
    setEditingId(null);
    setAddressForm({ ...emptyAddress });
  }

  async function saveAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSavingAddress(true);

    try {
      if (editingId) {
        await customerService.updateAddress(editingId, addressForm);
        setMessage("Cập nhật địa chỉ thành công");
      } else {
        await customerService.createAddress(addressForm);
        setMessage("Thêm địa chỉ thành công");
      }

      resetAddressForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu địa chỉ thất bại");
    } finally {
      setSavingAddress(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!window.confirm("Bạn muốn xóa địa chỉ này?")) return;

    setError("");
    setMessage("");
    setDeletingId(id);

    try {
      await customerService.deleteAddress(id);
      setAddresses((old) => old.filter((a) => a.id !== id));
      setMessage("Đã xóa địa chỉ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa địa chỉ thất bại");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="noi-dung">Đang tải hồ sơ...</div>;
  }

  if (!profile) {
    return (
      <div className="noi-dung">
        <p className="thong-bao-loi">{error || "Không tải được hồ sơ"}</p>
        <p>Vui lòng đăng nhập lại để xem thông tin.</p>
      </div>
    );
  }

  return (
    <div className="noi-dung">
      <div className="tieu-de">
        <div>
          <h2>Hồ sơ của tôi</h2>
          <p>Quản lý thông tin cá nhân và địa chỉ giao hàng</p>
        </div>
      </div>

      {error && <p className="thong-bao-loi">{error}</p>}
      {message && <p className="profile-success">{message}</p>}

      <section className="profile-card">
        <h3>Thông tin cá nhân</h3>
        <form onSubmit={updateProfile}>
          <label>
            Họ và tên
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input value={profile.email} disabled />
          </label>

          <label>
            Số điện thoại
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <label>
            Vai trò
            <input value={profile.role} disabled />
          </label>

          <button type="submit" disabled={savingProfile}>
            {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </section>

      <section className="profile-card">
        <h3>Địa chỉ giao hàng</h3>

        {addresses.length === 0 && <p>Bạn chưa có địa chỉ giao hàng.</p>}

        {addresses.map((a) => (
          <div className="address-item" key={a.id}>
            <div>
              <strong>{a.recipientName}</strong>
              {a.isDefault && <span className="default-tag">Mặc định</span>}
              <p>{a.phone}</p>
              <p>
                {[a.addressLine, a.ward, a.district, a.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <div className="address-actions">
              <button
                type="button"
                className="nut-sua"
                disabled={savingAddress || deletingId !== null}
                onClick={() => startEditAddress(a)}
              >
                Sửa
              </button>

              <button
                type="button"
                className="nut-xoa"
                disabled={savingAddress || deletingId !== null}
                onClick={() => void deleteAddress(a.id)}
              >
                {deletingId === a.id ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        ))}

        <h3>{editingId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3>

        <form onSubmit={saveAddress}>
          {(
            [
              ["recipientName", "Người nhận"],
              ["phone", "Số điện thoại"],
              ["addressLine", "Địa chỉ cụ thể"],
              ["ward", "Phường / Xã"],
              ["district", "Quận / Huyện"],
              ["province", "Tỉnh / Thành phố"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required={["recipientName", "phone", "addressLine"].includes(
                  key,
                )}
                value={addressForm[key]}
                onChange={(e) =>
                  setAddressForm((old) => ({
                    ...old,
                    [key]: e.target.value,
                  }))
                }
              />
            </label>
          ))}

          <label className="profile-checkbox">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(e) =>
                setAddressForm((old) => ({
                  ...old,
                  isDefault: e.target.checked,
                }))
              }
            />
            Đặt làm địa chỉ mặc định
          </label>

          <button type="submit" disabled={savingAddress || deletingId !== null}>
            {savingAddress
              ? "Đang lưu..."
              : editingId
                ? "Lưu địa chỉ"
                : "Thêm địa chỉ"}
          </button>

          {editingId && (
            <button
              type="button"
              disabled={savingAddress}
              onClick={resetAddressForm}
            >
              Hủy sửa
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
