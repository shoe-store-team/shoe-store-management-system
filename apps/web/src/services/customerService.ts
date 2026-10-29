
const API_URL =
  `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/customer`;

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || 'Yêu cầu thất bại');
  }

  return result;
}

export const customerService = {
  getProfile: () => request('/me'),

  updateProfile: (data: { name: string; phone: string }) =>
    request('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAddresses: () => request('/addresses'),

  createAddress: (data: Record<string, unknown>) =>
    request('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAddress: (id: string, data: Record<string, unknown>) =>
    request(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAddress: (id: string) =>
    request(`/addresses/${id}`, { method: 'DELETE' }),
};
