export interface ProductImage {
  url: string;
  type: string;
}

export interface Product {
  id: number;
  name: string;
  fullName?: string;
  slug: string;
  sku?: string;
  description?: string;
  price: number;
  categoryId: number;
  sortOrder: number;
  images: ProductImage[];
  deletedAt?: string;
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
  sku: string;
  description: string;
  price: string;
  categoryId: string;
  sortOrder: string;
}

export const emptyProductForm: ProductForm = {
  name: "",
  fullName: "",
  slug: "",
  sku: "",
  description: "",
  price: "",
  categoryId: "",
  sortOrder: "",
};

export interface VariantOption {
  id: number;
  name: string;
  priceDelta: number;
  sortOrder: number;
  groupId: number;
  isActive: boolean;
}

export interface VariantGroup {
  id: number;
  productId: number;
  name: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  options: VariantOption[];
}

export interface VariantGroupForm {
  name: string;
  isRequired: boolean;
  sortOrder: string;
  isActive: boolean;
}

export interface VariantOptionForm {
  name: string;
  priceDelta: string;
  sortOrder: string;
  isActive: boolean;
}

/** Локальная группа вариантов для инлайн-редактирования в форме создания товара */
export interface LocalVariantOption {
  _key: string;
  name: string;
  priceDelta: number;
  sortOrder: number;
  isActive: boolean;
}

export interface LocalVariantGroup {
  _key: string;
  name: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  options: LocalVariantOption[];
}
