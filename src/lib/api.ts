const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const data = await res.json()
      message = data?.message || message
    } catch {}
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T = unknown>(endpoint: string) =>
    fetch(`${API_URL}${endpoint}`, {
      credentials: 'include',
    }).then((r) => handleResponse<T>(r)),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),
}

export { ApiError, API_URL }
