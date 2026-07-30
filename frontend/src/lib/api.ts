export type User = {
  id: string;
  email: string;
  username: string;
  timezone: string;
  createdAt: string;
};

export type Tile = { date: string; done: boolean };

export type TaskSummary = {
  id: string;
  title: string;
  startedOn: string;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  doneToday: boolean;
  tiles: Tile[];
};

export type HeatmapDay = { date: string; completed: number; total: number };

export type Dashboard = {
  today: string;
  timezone: string;
  tasks: TaskSummary[];
  heatmap: HeatmapDay[];
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.error ?? "Something went wrong", response.status);
  }
  return body as T;
}

const post = (path: string, body?: unknown) =>
  request<{ ok?: boolean }>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const api = {
  me: () => request<{ user: User }>("/auth/me").then((r) => r.user),

  register: (input: { email: string; username: string; password: string; timezone: string }) =>
    request<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.user),

  login: (input: { emailOrUsername: string; password: string }) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.user),

  logout: () => post("/auth/logout"),

  updateProfile: (input: { username?: string; timezone?: string }) =>
    request<{ user: User }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }).then((r) => r.user),

  dashboard: (days = 30) => request<Dashboard>(`/dashboard?days=${days}`),

  createTask: (title: string) => post("/tasks", { title }),

  deleteTask: (id: string) => request<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),

  complete: (id: string, date: string) => post(`/tasks/${id}/complete`, { date }),

  uncomplete: (id: string, date: string) =>
    request<{ ok: boolean }>(`/tasks/${id}/complete/${date}`, { method: "DELETE" }),
};
