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
  options: RequestInit = {}
): Promise<Response> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  if (
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
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
    `${CATALOG_PROXY}/categories?${query.toString()}`
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
  const res = await fetchWithAuth(`${CATALOG_PROXY}/categories`, {
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
  }
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления категории");
  return res.json();
}

export async function deleteCategory(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Ошибка удаления категории");
}

// ---- Products API ----
export async function getProducts() {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/products/admin`);
  if (!res.ok) throw new Error("Ошибка загрузки товаров");
  return res.json();
}

export async function getProduct(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/products/admin/${id}`);
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
  const res = await fetchWithAuth(`${CATALOG_PROXY}/products/admin`, {
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
  }
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/products/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления товара");
  return res.json();
}

export async function deleteProduct(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/products/admin/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Ошибка удаления товара");
}

// ---- Branches API ----
export async function getBranches() {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branches`);
  if (!res.ok) throw new Error("Ошибка загрузки филиалов");
  return res.json();
}

export async function getBranch(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branches/${id}`);
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
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branches`, {
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
  }
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления филиала");
  return res.json();
}

export async function deleteBranch(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branches/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Ошибка удаления филиала");
}

// ---- Branch Products API ----
export async function getBranchProducts() {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branch-products`);
  if (!res.ok) throw new Error("Ошибка загрузки товаров по филиалам");
  return res.json();
}

export async function createBranchProduct(data: {
  productId: number;
  branchId: number;
  price: number;
  stock?: number;
  isActive?: boolean;
}) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branch-products`, {
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
  data: { price?: number; stock?: number; isActive?: boolean }
) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branch-products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления товара в филиале");
  return res.json();
}

export async function deleteBranchProduct(id: number) {
  const res = await fetchWithAuth(`${CATALOG_PROXY}/branch-products/${id}`, {
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
// Документация: https://dev-image-s.russoft-it.ru/docs (POST /images/upload → ImageDto.externalId).
// Привязка к товару: entityType="catalog.product", entityId=id товара (строка). Каталог при отдаче ProductDto
// должен подгружать images из image-сервиса по product id (в Swagger каталога нет POST .../images).
export async function uploadImage(
  file: File,
  options: { entityType: string; entityId: string }
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityType", options.entityType);
  formData.append("entityId", options.entityId);

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
