
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface ApiResponse<T> {
  message?: string;
  data?: T;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(result.message || "Yêu cầu thất bại");
  }

  if (result.data === undefined) {
    throw new Error("API không trả về dữ liệu hợp lệ");
  }

  return result.data;
}

export const authService = {
  login(input: LoginInput): Promise<LoginResponse> {
    return post<LoginResponse>("/auth/login", input);
  },

  register(input: RegisterInput): Promise<AuthUser> {
    return post<AuthUser>("/auth/register", input);
  },
};
