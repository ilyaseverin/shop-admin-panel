export interface Category {
  id: number;
  name: string;
  fullName: string;
  slug: string;
  description: string;
  parentId: number;
  images: { url: string; type: string }[];
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
