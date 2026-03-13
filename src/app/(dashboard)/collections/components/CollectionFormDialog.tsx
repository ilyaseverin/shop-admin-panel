"use client";

import { useEffect, useState } from "react";
import {
  createCollection,
  updateCollection,
  getProducts,
} from "@/lib/api";
import { invalidateCollections } from "@/lib/swr";
import { useDebounce } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Collection, CollectionForm, CollectionProduct } from "../types";
import { emptyCollectionForm } from "../types";

interface CollectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  onSaved: () => void;
}

type FieldErrors = Partial<Record<keyof CollectionForm, string>>;

function validate(form: CollectionForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.title.trim()) errors.title = "Введите название коллекции";
  return errors;
}

interface SelectedProduct {
  id: number;
  name: string;
}

export function CollectionFormDialog({
  open,
  onOpenChange,
  collection,
  onSaved,
}: CollectionFormDialogProps) {
  const editingId = collection?.id ?? null;
  const [form, setForm] = useState<CollectionForm>(emptyCollectionForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Product multi-select
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchPage, setProductSearchPage] = useState(1);
  const [productSearchTotal, setProductSearchTotal] = useState(0);

  const PRODUCT_SEARCH_LIMIT = 5;
  const debouncedProductSearch = useDebounce(productSearch, 300);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitted(false);
    if (collection) {
      setForm({
        title: collection.title || "",
        description: collection.description || "",
      });
      const prods: SelectedProduct[] = (collection.products || []).map(
        (p: CollectionProduct) => ({ id: p.id, name: p.name }),
      );
      if (prods.length === 0 && collection.productIds?.length) {
        setSelectedProducts(
          collection.productIds.map((id) => ({ id, name: `#${id}` })),
        );
      } else {
        setSelectedProducts(prods);
      }
    } else {
      setForm(emptyCollectionForm);
      setSelectedProducts([]);
    }
    setProductSearch("");
    setProductSearchPage(1);
  }, [open, collection]);

  // Product search
  useEffect(() => {
    if (!productDropdownOpen) return;
    let cancelled = false;
    setProductSearchLoading(true);
    getProducts({
      page: productSearchPage,
      limit: PRODUCT_SEARCH_LIMIT,
      name: debouncedProductSearch.trim() || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        const items = (data?.items ?? []) as {
          id: number;
          name: string;
          slug: string;
        }[];
        const total = data?.meta?.total ?? items.length;
        setProductSearchResults(items);
        setProductSearchTotal(total);
      })
      .catch(() => {
        if (!cancelled) setProductSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setProductSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productDropdownOpen, debouncedProductSearch, productSearchPage]);

  const productSearchTotalPages =
    Math.ceil(productSearchTotal / PRODUCT_SEARCH_LIMIT) || 1;

  const addProduct = (product: { id: number; name: string }) => {
    if (selectedProducts.some((p) => p.id === product.id)) return;
    setSelectedProducts((prev) => [...prev, product]);
  };

  const removeProduct = (id: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateField = <K extends keyof CollectionForm>(
    key: K,
    value: CollectionForm[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async () => {
    setSubmitted(true);
    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        productIds: selectedProducts.map((p) => p.id),
      };
      if (editingId) {
        await updateCollection(editingId, payload);
        toast.success("Коллекция обновлена");
      } else {
        await createCollection(payload);
        toast.success("Коллекция создана");
      }
      onOpenChange(false);
      invalidateCollections();
      onSaved();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Редактировать коллекцию" : "Новая коллекция"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Летняя коллекция"
              className={`bg-muted/50 ${errors.title ? "border-destructive" : ""}`}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Описание коллекции..."
              className="bg-muted/50 resize-none"
              rows={3}
            />
          </div>

          {/* Product multi-select */}
          <div className="space-y-2">
            <Label>Товары</Label>
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedProducts.map((p) => (
                  <Badge
                    key={p.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id)}
                      className="ml-1 w-4 h-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductDropdownOpen(true);
                  setProductSearchPage(1);
                }}
                onFocus={() => setProductDropdownOpen(true)}
                onBlur={() =>
                  setTimeout(() => setProductDropdownOpen(false), 200)
                }
                placeholder="Поиск товаров..."
                className="pl-9 bg-muted/50"
              />
              {productDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover shadow-lg max-h-48 overflow-auto"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {productSearchLoading ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      Поиск...
                    </div>
                  ) : productSearchResults.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {debouncedProductSearch.trim()
                        ? "Товары не найдены"
                        : "Введите название для поиска"}
                    </div>
                  ) : (
                    <>
                      <ul className="p-1">
                        {productSearchResults.map((product) => {
                          const isSelected = selectedProducts.some(
                            (p) => p.id === product.id,
                          );
                          return (
                            <li key={product.id}>
                              <button
                                type="button"
                                disabled={isSelected}
                                className={`w-full text-left px-3 py-2 text-sm rounded-sm cursor-pointer ${
                                  isSelected
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-accent focus:bg-accent focus:outline-none"
                                }`}
                                onClick={() => {
                                  addProduct({
                                    id: product.id,
                                    name: product.name,
                                  });
                                }}
                              >
                                {product.name}
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {product.slug}
                                </span>
                                {isSelected && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    (добавлен)
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {productSearchTotalPages > 1 && (
                        <div className="flex items-center justify-between gap-2 px-2 py-2 border-t text-sm">
                          <span className="text-muted-foreground">
                            {productSearchTotal} всего
                          </span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={productSearchPage <= 1}
                              onClick={() =>
                                setProductSearchPage((p) => Math.max(1, p - 1))
                              }
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <span className="flex items-center px-2 text-muted-foreground">
                              {productSearchPage} / {productSearchTotalPages}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={
                                productSearchPage >= productSearchTotalPages
                              }
                              onClick={() =>
                                setProductSearchPage((p) =>
                                  Math.min(productSearchTotalPages, p + 1),
                                )
                              }
                            >
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500"
            >
              {saving ? "Сохранение..." : editingId ? "Обновить" : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
