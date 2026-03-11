"use client";

import useSWR, { mutate as globalMutate } from "swr";
import {
  getProducts,
  getCategories,
  getBranches,
  getBranchProducts,
} from "./api";

export function useProducts(params: {
  page: number;
  limit: number;
  name?: string;
}) {
  return useSWR(
    ["products", params.page, params.limit, params.name] as const,
    () => getProducts(params),
  );
}

export function useCategories(params: {
  page?: number;
  limit?: number;
  name?: string;
}) {
  return useSWR(
    ["categories", params.page, params.limit, params.name] as const,
    () => getCategories(params),
  );
}

export function useBranches(params: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) {
  return useSWR(
    ["branches", params.page, params.limit, params.isActive] as const,
    () => getBranches(params),
  );
}

export function useBranchProducts(params: {
  branchId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  return useSWR(
    [
      "branch-products",
      params.branchId,
      params.isActive,
      params.page,
      params.limit,
    ] as const,
    () => getBranchProducts(params),
  );
}

export function invalidateProducts() {
  globalMutate(
    (key) => Array.isArray(key) && key[0] === "products",
    undefined,
    { revalidate: true },
  );
}

export function invalidateCategories() {
  return globalMutate(
    (key) => Array.isArray(key) && key[0] === "categories",
    undefined,
    { revalidate: true },
  );
}

export function invalidateBranches() {
  return globalMutate(
    (key) => Array.isArray(key) && key[0] === "branches",
    undefined,
    { revalidate: true },
  );
}

export function invalidateBranchProducts() {
  globalMutate(
    (key) => Array.isArray(key) && key[0] === "branch-products",
    undefined,
    { revalidate: true },
  );
}
