"use client";

import { getTokens, setTokens, clearAuth } from "./auth";

// All requests go through local Next.js API routes to avoid CORS
const CATALOG_PROXY = "/api/catalog";
const IMAGE_PROXY = "/api/images";
const AUTH_PROXY = "/api/auth";

async function refreshTokens(): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens?.refreshToken) return false;

  try {
    const res = await fetch(`${AUTH_PROXY}/users/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.tokens);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && tokens?.refreshToken) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const newTokens = getTokens();
      headers["Authorization"] = `Bearer ${newTokens?.accessToken}`;
      res = await fetch(url, { ...options, headers });
    } else {
      clearAuth();
      window.location.href = "/login";
    }
  }

  return res;
}

// ---- Auth API ----
export async function loginApi(login: string, password: string) {
  const res = await fetch(`${AUTH_PROXY}/users/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error("Ошибка авторизации");
  return res.json();
}

// ---- Categories API ----
export async function getCategories(params?: {
  page?: number;
  limit?: number;
  name?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.name) query.set("name", params.name);

  const res = await fetchWithAuth(
    `${CATALOG_PROXY}/api/admin/categories?${query.toString()}`,
  );
  if (!res.ok) throw new Error("Ошибка загрузки категорий");
  return res.json();
}

export async function createCategory(data: {
  name: string;
  slug: string;
  fullName?: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
}) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/categories`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка создания категории");
  return res.json();
}

export async function updateCategory(
  id: number,
  data: {
    name?: string;
    slug?: string;
    fullName?: string;
    description?: string;
    parentId?: number;
    sortOrder?: number;
  },
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления категории");
  return res.json();
}

export async function deleteCategory(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Ошибка удаления категории");
}

/** Проверка, занят ли слаг другой категорией (при excludeId — кроме этой). */
export async function checkCategorySlugExists(
  slug: string,
  excludeId?: number,
): Promise<boolean> {
  if (!slug?.trim()) return false;
  const norm = slug.trim().toLowerCase();
  const data = await getCategories({ limit: 5000 });
  const list = (data as { items?: { id: number; slug: string }[] }).items ?? [];
  return list.some(
    (c: { id: number; slug?: string }) =>
      (c.slug ?? "").toLowerCase() === norm && c.id !== excludeId,
  );
}

// ---- Products API ----
export async function getProducts() {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/products`);
  if (!res.ok) throw new Error("Ошибка загрузки товаров");
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export async function getProduct(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/products/${id}`);
  if (!res.ok) throw new Error("Ошибка загрузки товара");
  return res.json();
}

export async function createProduct(data: {
  name: string;
  slug: string;
  price: number;
  categoryId: number;
  fullName?: string;
  description?: string;
  sortOrder?: number;
}) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка создания товара");
  return res.json();
}

export async function updateProduct(
  id: number,
  data: {
    name?: string;
    slug?: string;
    price?: number;
    categoryId?: number;
    fullName?: string;
    description?: string;
    sortOrder?: number;
  },
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления товара");
  return res.json();
}

export async function deleteProduct(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Ошибка удаления товара");
}

/** Проверка, занят ли слаг другим товаром (при excludeId — кроме этого). */
export async function checkProductSlugExists(
  slug: string,
  excludeId?: number,
): Promise<boolean> {
  if (!slug?.trim()) return false;
  const norm = slug.trim().toLowerCase();
  const items = await getProducts();
  return items.some(
    (p: { id: number; slug?: string }) =>
      (p.slug ?? "").toLowerCase() === norm && p.id !== excludeId,
  );
}

// ---- Branches API (Admin: /api/admin/branches) ----
export async function getBranches(params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 5000));
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  const url = `${CATALOG_PROXY}/api/admin/branches?${query.toString()}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error("Ошибка загрузки филиалов");
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export async function getBranch(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branches/${id}`);
  if (!res.ok) throw new Error("Ошибка загрузки филиала");
  return res.json();
}

export async function createBranch(data: {
  name: string;
  address: string;
  description?: string;
  city?: string;
  region?: string;
  phone?: string;
  isActive?: boolean;
}) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branches`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка создания филиала");
  return res.json();
}

export async function updateBranch(
  id: number,
  data: {
    name?: string;
    address?: string;
    description?: string;
    city?: string;
    region?: string;
    phone?: string;
    isActive?: boolean;
  },
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления филиала");
  return res.json();
}

export async function deleteBranch(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branches/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Ошибка удаления филиала");
}

// ---- Branch Products API ----
export async function getBranchProducts(params?: {
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.limit != null) query.set("limit", String(params.limit));
  const qs = query.toString();
  const url = `${CATALOG_PROXY}/api/admin/branch-products${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error("Ошибка загрузки товаров по филиалам");
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.items ?? []);
}

/** Загружает все привязки (и активные, и неактивные). Бэкенд может отдавать по isActive отдельно. */
export async function getAllBranchProducts(): Promise<
  { id: number; productId: number; branchId: number; price: number; stock: number; isActive: boolean }[]
> {
  const [activeRes, inactiveRes] = await Promise.all([
    getBranchProducts({ isActive: true, limit: 5000 }),
    getBranchProducts({ isActive: false, limit: 5000 }),
  ]);
  const active = Array.isArray(activeRes) ? activeRes : [];
  const inactive = Array.isArray(inactiveRes) ? inactiveRes : [];
  const byId = new Map<number, { id: number; productId: number; branchId: number; price: number; stock: number; isActive: boolean }>();
  for (const row of [...active, ...inactive]) {
    byId.set(row.id, { ...row, isActive: row.isActive ?? true });
  }
  return Array.from(byId.values());
}

export async function createBranchProduct(data: {
  productId: number;
  branchId: number;
  price: number;
  stock?: number;
  isActive?: boolean;
}) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branch-products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = new Error("Ошибка привязки товара к филиалу") as Error & {
      status?: number;
      body?: string;
    };
    err.status = res.status;
    err.body = await res.text();
    throw err;
  }
  return res.json();
}

export async function updateBranchProduct(
  id: number,
  data: { price?: number; stock?: number; isActive?: boolean },
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branch-products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = "Ошибка обновления товара в филиале";
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body?.message) msg = body.message;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function deleteBranchProduct(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/api/admin/branch-products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error("Ошибка отвязки товара от филиала"), {
      status: res.status,
      body: text,
    });
  }
}

// ---- Image API ----
// image_service: POST /images/upload — multipart/form-data: file, entityType, entityId, imageType? (UploadImageDto).
export async function uploadImage(
  file: File,
  options: { entityType: string; entityId: string; imageType?: string },
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityType", options.entityType);
  formData.append("entityId", options.entityId);
  if (options.imageType != null && options.imageType !== "") {
    formData.append("imageType", options.imageType);
  }

  const tokens = getTokens();
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  const res = await fetch(`${IMAGE_PROXY}/images/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error("Ошибка загрузки изображения");
  return res.json();
}

export function getImageUrl(externalId: string) {
  return `${IMAGE_PROXY}/images/${externalId}`;
}
