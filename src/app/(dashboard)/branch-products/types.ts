export interface BranchProduct {
  id: number;
  productId: number;
  branchId: number;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  name: string;
  fullName?: string;
  slug: string;
  price: number;
  categoryId: number;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
}

export interface Category {
  id: number;
  name: string;
}
