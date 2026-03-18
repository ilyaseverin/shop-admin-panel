export interface CategoryImage {
  url: string;
  type: string;
  title?: string;
  description?: string;
}

export const CATEGORY_IMAGE_TYPES = [
  { value: "main", label: "Главная" },
  { value: "background", label: "Фоновое изображение на странице" },
] as const;

export interface Category {
  id: number;
  name: string;
  fullName: string;
  slug: string;
  description: string;
  parentId: number;
  images: CategoryImage[];
  deletedAt?: string;
}

export interface CategoryForm {
  name: string;
  fullName: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
}

export const emptyCategoryForm: CategoryForm = {
  name: "",
  fullName: "",
  slug: "",
  description: "",
  parentId: "",
  sortOrder: "",
};
