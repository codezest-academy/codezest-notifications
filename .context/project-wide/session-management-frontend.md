# Session Management & Authentication - Frontend Guide

**Purpose**: Secure session management and authentication implementation for Next.js frontend  
**Last Updated**: 2025-11-27  
**Status**: Official Standard

---

## 🎯 Overview

This guide defines how the CodeZest Admin frontend handles authentication, sessions, and token management securely.

### Core Principles

1. **Never store tokens in localStorage** - XSS vulnerable
2. **Use httpOnly cookies** - Server-managed, XSS protected
3. **Implement CSRF protection** - Prevent cross-site attacks
4. **Auto-refresh tokens** - Seamless user experience
5. **Fail securely** - Redirect to login on auth errors

---

## 🏗️ Architecture

### Token Flow

```
User Login
    ↓
Next.js API Route (/api/auth/login)
    ↓
Express Backend (POST /auth/login)
    ↓
Backend sets httpOnly cookies
    ↓
Next.js forwards Set-Cookie headers
    ↓
Browser stores cookies (automatic)
    ↓
All subsequent requests include cookies (automatic)
```

### Why This Architecture?

**Security**:

- ✅ Tokens never exposed to JavaScript (XSS protected)
- ✅ Cookies auto-sent with requests (no manual handling)
- ✅ CSRF tokens prevent cross-site attacks
- ✅ Short-lived access tokens limit damage

**User Experience**:

- ✅ Automatic token refresh (no interruptions)
- ✅ Persistent sessions across tabs
- ✅ Clean logout across all tabs

---

## 📁 File Structure

```
app/
├── api/
│   └── auth/
│       ├── login/route.ts          # Proxy login to backend
│       ├── register/route.ts       # Proxy registration
│       ├── logout/route.ts         # Proxy logout
│       ├── refresh/route.ts        # Proxy token refresh
│       └── csrf-token/route.ts     # Get CSRF token
│
src/lib/
├── services/
│   ├── auth.service.ts             # Auth operations (NO token storage)
│   ├── http-client.service.ts      # HTTP client with auto-refresh
│   └── csrf.service.ts             # CSRF token management
│
├── types/
│   └── auth.types.ts               # Auth type definitions
│
└── hooks/
    └── useAuth.ts                  # Auth state management
```

---

## 🔧 Implementation

### 1. API Route Handlers (Proxy Pattern)

**Purpose**: Forward requests to backend and proxy Set-Cookie headers

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward to Express backend
    const response = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include", // ✅ Important: Include cookies
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // ✅ Forward Set-Cookie headers from backend to browser
    const nextResponse = NextResponse.json(data);

    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Apply same pattern to**:

- `register/route.ts`
- `logout/route.ts`
- `refresh/route.ts`

---

### 2. Auth Service (No Token Storage)

**Purpose**: Handle auth operations WITHOUT storing tokens

```typescript
// src/lib/services/auth.service.ts
import httpClient from "./http-client.service";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
} from "../types/auth.types";

class AuthService {
  /**
   * Login user
   * ✅ Cookies are automatically set by Set-Cookie headers
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>("/api/auth/login", {
      body: data,
    });
  }

  /**
   * Register new user
   * ✅ Cookies are automatically set by Set-Cookie headers
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>("/api/auth/register", {
      body: data,
    });
  }

  /**
   * Logout user
   * ✅ Cookies are automatically cleared by backend
   */
  async logout(): Promise<void> {
    await httpClient.post("/api/auth/logout", {});
  }

  /**
   * Get current user
   * ✅ Cookies are automatically sent with request
   */
  async getCurrentUser(): Promise<User> {
    return httpClient.get<User>("/api/auth/me");
  }

  /**
   * Refresh access token
   * ✅ New cookies are automatically set by backend
   */
  async refreshToken(): Promise<void> {
    await httpClient.post("/api/auth/refresh", {});
  }
}

export const authService = new AuthService();
export default authService;
```

---

### 3. HTTP Client with Auto-Refresh

**Purpose**: Automatically refresh tokens on 401 errors

```typescript
// src/lib/services/http-client.service.ts
interface RequestConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: HeadersInit;
}

class HttpClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  async get<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: "GET", ...config });
  }

  async post<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: "POST", ...config });
  }

  async put<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: "PUT", ...config });
  }

  async delete<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.request<T>({ url, method: "DELETE", ...config });
  }

  private async request<T>(config: RequestConfig): Promise<T> {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...config.headers,
      };

      // ✅ Add CSRF token for non-GET requests
      if (config.method !== "GET") {
        const csrfToken = this.getCsrfToken();
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }
      }

      const response = await fetch(config.url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        credentials: "include", // ✅ Always send cookies
      });

      // ✅ Handle 401 - Token expired
      if (response.status === 401 && !config.url.includes("/auth/")) {
        const refreshed = await this.handleTokenRefresh();

        if (refreshed) {
          // Retry original request
          return this.request<T>(config);
        } else {
          // Refresh failed - redirect to login
          window.location.href = "/login";
          throw new Error("Session expired");
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle token refresh with deduplication
   */
  private async handleTokenRefresh(): Promise<boolean> {
    // ✅ Prevent multiple simultaneous refresh requests
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.tryRefreshToken();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get CSRF token from cookie
   */
  private getCsrfToken(): string | null {
    if (typeof document === "undefined") return null;

    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? match[1] : null;
  }
}

export const httpClient = new HttpClient();
export default httpClient;
```

---

### 4. CSRF Token Management

```typescript
// src/lib/services/csrf.service.ts
class CsrfService {
  private csrfToken: string | null = null;

  /**
   * Initialize CSRF token on app load
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch("/api/auth/csrf-token", {
        credentials: "include",
      });
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
    }
  }

  /**
   * Get current CSRF token
   */
  getToken(): string | null {
    return this.csrfToken;
  }
}

export const csrfService = new CsrfService();
export default csrfService;
```

---

### 5. Auth Hook

```typescript
// src/lib/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { authService } from "../services/auth.service";
import type { User } from "../types/auth.types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err as Error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refetch: loadUser,
  };
}
```

---

## 🔒 Security Checklist

### ✅ Required Implementations

- [ ] All auth API routes proxy to backend
- [ ] All API routes forward Set-Cookie headers
- [ ] HTTP client sends `credentials: 'include'`
- [ ] HTTP client adds CSRF token to non-GET requests
- [ ] Auto-refresh on 401 errors
- [ ] Redirect to login on refresh failure
- [ ] No tokens stored in localStorage/sessionStorage
- [ ] CSRF token initialized on app load

### ❌ Never Do This

```typescript
// ❌ NEVER store tokens in localStorage
localStorage.setItem("accessToken", token);

// ❌ NEVER manually set Authorization header
headers["Authorization"] = `Bearer ${token}`;

// ❌ NEVER send tokens in URL
window.location.href = `/dashboard?token=${token}`;

// ❌ NEVER forget credentials: 'include'
fetch("/api/data"); // Missing credentials!
```

### ✅ Always Do This

```typescript
// ✅ Let cookies handle authentication
fetch("/api/data", {
  credentials: "include", // Cookies sent automatically
});

// ✅ Add CSRF token for mutations
headers["X-CSRF-Token"] = getCsrfToken();

// ✅ Handle 401 gracefully
if (response.status === 401) {
  await refreshToken();
  // Retry request
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login sets cookies (check DevTools → Application → Cookies)
- [ ] Cookies have `HttpOnly` flag
- [ ] Cookies have `Secure` flag (production)
- [ ] Cookies have `SameSite=Strict`
- [ ] Logout clears cookies
- [ ] Token auto-refreshes on 401
- [ ] CSRF token sent with POST/PUT/DELETE
- [ ] Tokens NOT accessible via `document.cookie`

### DevTools Verification

```javascript
// ✅ This should return empty or only non-httpOnly cookies
console.log(document.cookie);

// ❌ If you see accessToken or refreshToken, SECURITY ISSUE!
```

---

## 🚀 Migration from localStorage

### Step 1: Remove Token Storage

```typescript
// ❌ Remove this
class TokenStorageService {
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
  }
}

// ✅ Delete the entire file
// Cookies are managed by backend via Set-Cookie headers
```

### Step 2: Update Auth Service

```typescript
// ❌ Before
async login(data: LoginRequest) {
  const response = await httpClient.post('/api/auth/login', { body: data });
  tokenStorage.setTokens(response.tokens); // Remove this
  return response;
}

// ✅ After
async login(data: LoginRequest) {
  const response = await httpClient.post('/api/auth/login', { body: data });
  // Cookies are automatically set by Set-Cookie headers
  return response;
}
```

### Step 3: Update HTTP Client

```typescript
// ❌ Before
headers["Authorization"] = `Bearer ${tokenStorage.getAccessToken()}`;

// ✅ After
// Remove Authorization header - cookies sent automatically
credentials: "include";
```

---

## 📚 References

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Next.js Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [MDN HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

---

**Last Updated**: 2025-11-27  
**Status**: Official Standard  
**Priority**: CRITICAL (Security)
