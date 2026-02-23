export interface ProductImage {
  url: string;
  type: string;
}

export interface Product {
  id: number;
  name: string;
  fullName?: string;
  slug: string;
  description?: string;
  price: number;
  categoryId: number;
  sortOrder: number;
  images: ProductImage[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductForm {
  name: string;
  fullName: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  sortOrder: string;
}

export const emptyProductForm: ProductForm = {
  name: "",
  fullName: "",
  slug: "",
  description: "",
  price: "",
  categoryId: "",
  sortOrder: "",
};
