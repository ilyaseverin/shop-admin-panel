export interface CollectionProduct {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  article?: string;
}

export interface Collection {
  id: number;
  title: string;
  description?: string;
  productIds: number[];
  products: CollectionProduct[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CollectionForm {
  title: string;
  description: string;
}

export const emptyCollectionForm: CollectionForm = {
  title: "",
  description: "",
};
