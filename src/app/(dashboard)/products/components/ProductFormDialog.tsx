"use client";

import { useEffect, useState, useRef } from "react";
import {
  getCategories,
  createProduct,
  updateProduct,
  uploadImage,
  getImageUrl,
  checkProductSlugExists,
  updateImageType,
  deleteImage,
  getImageDetails,
} from "@/lib/api";
import { invalidateProducts } from "@/lib/swr";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";
import { useDebounce } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload,
  X,
  Star,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Product, ProductImage, Category, ProductForm, LocalVariantGroup, LocalVariantOption } from "../types";
import { emptyProductForm } from "../types";
import { VariantManager, type VariantManagerHandle } from "./VariantManager";

const CATEGORY_SEARCH_LIMIT = 5;
const SLUG_CHECK_DELAY_MS = 400;

let _keyCounter = 0;
function nextKey() {
  return `_k${++_keyCounter}`;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSaved: () => void;
}

type FieldErrors = Partial<Record<keyof ProductForm, string>>;

function validateProductForm(form: ProductForm, slugExists: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Введите название товара";
  if (!form.slug.trim()) errors.slug = "Введите slug";
  else if (slugExists) errors.slug = "Слаг уже используется";
  if (!form.price || Number(form.price) < 0) errors.price = "Укажите корректную цену";
  if (!form.categoryId) errors.categoryId = "Выберите категорию";
  return errors;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: ProductFormDialogProps) {
  const editingId = product?.id ?? null;

  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [saving, setSaving] = useState(false);
  const [slugExists, setSlugExists] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Original image types from server (to detect changes on save)
  const originalImageTypesRef = useRef<Map<string, string>>(new Map());
  const variantManagerRef = useRef<VariantManagerHandle>(null);

  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearchResults, setCategorySearchResults] = useState<Category[]>([]);
  const [categorySearchLoading, setCategorySearchLoading] = useState(false);
  const [categorySearchPage, setCategorySearchPage] = useState(1);
  const [categorySearchTotal, setCategorySearchTotal] = useState(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");

  // Local variant groups (for creation mode)
  const [localGroups, setLocalGroups] = useState<LocalVariantGroup[]>([]);
  const [expandedLocalGroups, setExpandedLocalGroups] = useState<Set<string>>(new Set());

  const debouncedCategorySearch = useDebounce(categorySearch, 300);

  const clearFieldError = (key: string) => {
    if (submitted) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FieldErrors];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setSubmitted(false);
    originalImageTypesRef.current = new Map();
    if (product) {
      setForm({
        name: product.name || "",
        fullName: product.fullName || "",
        sku: product.sku || "",
        slug: product.slug || "",
        description: product.description || "",
        price: String(product.price ?? ""),
        categoryId: String(product.categoryId ?? ""),
        sortOrder: String(product.sortOrder ?? ""),
      });
      const images = product.images || [];
      setUploadedImages(images);
      setPendingFiles([]);
      if (images.length > 0) {
        Promise.all(
          images.map(async (img) => {
            try {
              const details = await getImageDetails(img.url);
              return { url: img.url, type: details.imageType || img.type };
            } catch {
              return null;
            }
          })
        ).then((results) => {
          const valid = results.filter(
            (r): r is ProductImage => r !== null,
          );
          const map = new Map<string, string>();
          for (const img of valid) {
            map.set(img.url, img.type);
          }
          originalImageTypesRef.current = map;
          setUploadedImages(valid);
        });
      }
      setSelectedCategoryName(
        categories.find((c) => c.id === product.categoryId)?.name || ""
      );
    } else {
      setForm(emptyProductForm);
      setUploadedImages([]);
      setPendingFiles([]);
      setSelectedCategoryName("");
    }
    setLocalGroups([]);
    setExpandedLocalGroups(new Set());
    setCategorySearch("");
    setCategorySearchPage(1);
    setSlugExists(false);
  }, [open, product, categories]);

  useEffect(() => {
    if (!open || !form.slug?.trim()) {
      setSlugExists(false);
      return;
    }
    setSlugExists(false);
    const t = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const exists = await checkProductSlugExists(
          form.slug.trim(),
          editingId ?? undefined
        );
        setSlugExists(exists);
      } catch {
        setSlugExists(false);
      } finally {
        setSlugChecking(false);
      }
    }, SLUG_CHECK_DELAY_MS);
    return () => clearTimeout(t);
  }, [open, form.slug, editingId]);

  // Category search
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    let cancelled = false;
    setCategorySearchLoading(true);
    getCategories({
      page: categorySearchPage,
      limit: CATEGORY_SEARCH_LIMIT,
      name: debouncedCategorySearch.trim() || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        const items = (data as { items?: Category[] }).items ?? [];
        const total =
          (data as { meta?: { total?: number } }).meta?.total ?? items.length;
        setCategorySearchResults(items);
        setCategorySearchTotal(total);
      })
      .catch(() => {
        if (!cancelled) setCategorySearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setCategorySearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryDropdownOpen, debouncedCategorySearch, categorySearchPage]);

  const categorySearchTotalPages =
    Math.ceil(categorySearchTotal / CATEGORY_SEARCH_LIMIT) || 1;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const blobUrl = URL.createObjectURL(file);
      setPendingFiles((prev) => [...prev, file]);
      setUploadedImages((prev) => [...prev, { url: blobUrl, type: "gallery" }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = async (index: number) => {
    const removed = uploadedImages[index];
    if (!removed) return;
    const isBlob = removed.url.startsWith("blob:");

    if (isBlob) {
      URL.revokeObjectURL(removed.url);
      const blobIndex = uploadedImages
        .slice(0, index)
        .filter((img) => img.url.startsWith("blob:")).length;
      setPendingFiles((p) => p.filter((_, i) => i !== blobIndex));
    } else {
      try {
        await deleteImage(removed.url);
        invalidateProducts();
      } catch {
        toast.error("Ошибка удаления изображения");
        return;
      }
    }
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Only updates local state — API call happens on save
  const setMainImage = (index: number) => {
    setUploadedImages((prev) =>
      prev.map((im, i) => ({
        ...im,
        type: i === index ? "main" : "gallery",
      }))
    );
  };

  // ---- Local variant groups helpers (creation mode) ----
  const addLocalGroup = () => {
    const key = nextKey();
    setLocalGroups((prev) => [
      ...prev,
      { _key: key, name: "", isRequired: false, sortOrder: prev.length, isActive: true, options: [] },
    ]);
    setExpandedLocalGroups((prev) => new Set(prev).add(key));
  };

  const updateLocalGroup = (key: string, patch: Partial<LocalVariantGroup>) => {
    setLocalGroups((prev) =>
      prev.map((g) => (g._key === key ? { ...g, ...patch } : g))
    );
  };

  const removeLocalGroup = (key: string) => {
    setLocalGroups((prev) => prev.filter((g) => g._key !== key));
  };

  const addLocalOption = (groupKey: string) => {
    setLocalGroups((prev) =>
      prev.map((g) =>
        g._key === groupKey
          ? {
              ...g,
              options: [
                ...g.options,
                { _key: nextKey(), name: "", priceDelta: 0, sortOrder: g.options.length, isActive: true },
              ],
            }
          : g
      )
    );
  };

  const updateLocalOption = (groupKey: string, optKey: string, patch: Partial<LocalVariantOption>) => {
    setLocalGroups((prev) =>
      prev.map((g) =>
        g._key === groupKey
          ? { ...g, options: g.options.map((o) => (o._key === optKey ? { ...o, ...patch } : o)) }
          : g
      )
    );
  };

  const removeLocalOption = (groupKey: string, optKey: string) => {
    setLocalGroups((prev) =>
      prev.map((g) =>
        g._key === groupKey
          ? { ...g, options: g.options.filter((o) => o._key !== optKey) }
          : g
      )
    );
  };

  const toggleLocalGroup = (key: string) => {
    setExpandedLocalGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitted(true);
    const errs = validateProductForm(form, slugExists);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: Parameters<typeof createProduct>[0] = {
        name: form.name,
        slug: form.slug,
        price: Number(form.price),
        categoryId: Number(form.categoryId),
        fullName: form.fullName || undefined,
        sku: form.sku || undefined,
        description: form.description || undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      };

      if (editingId) {
        await updateProduct(editingId, payload);

        // Upload new images
        const blobImages = uploadedImages.filter((img) =>
          img.url.startsWith("blob:")
        );
        if (pendingFiles.length > 0) {
          setUploading(true);
          try {
            for (let i = 0; i < pendingFiles.length; i++) {
              await uploadImage(pendingFiles[i], {
                entityType: "catalog.product",
                entityId: String(editingId),
                imageType: blobImages[i]?.type || "gallery",
              });
            }
          } finally {
            setUploading(false);
          }
        }

        // Update image types that changed (server images only)
        const origTypes = originalImageTypesRef.current;
        for (const img of uploadedImages) {
          if (img.url.startsWith("blob:")) continue;
          const origType = origTypes.get(img.url);
          if (origType && origType !== img.type) {
            await updateImageType(img.url, img.type);
          }
        }

        // Save variant changes
        if (variantManagerRef.current) {
          await variantManagerRef.current.save();
        }

        toast.success("Товар обновлён");
        onOpenChange(false);
        invalidateProducts();
        onSaved();
      } else {
        // Include local variant groups in creation payload
        const filledGroups = localGroups.filter((g) => g.name.trim());
        if (filledGroups.length > 0) {
          payload.variantGroups = filledGroups.map((g) => ({
            name: g.name.trim(),
            isRequired: g.isRequired,
            sortOrder: g.sortOrder,
            isActive: g.isActive,
            options: g.options
              .filter((o) => o.name.trim())
              .map((o) => ({
                name: o.name.trim(),
                priceDelta: o.priceDelta,
                sortOrder: o.sortOrder,
                isActive: o.isActive,
              })),
          }));
        }

        const created = await createProduct(payload);
        const newId = created?.id ?? (created as { data?: { id?: number } })?.data?.id;
        if (newId == null) {
          toast.success("Товар создан");
          onOpenChange(false);
          onSaved();
          return;
        }
        if (pendingFiles.length > 0) {
          setUploading(true);
          try {
            const blobImgs = uploadedImages.filter((img) =>
              img.url.startsWith("blob:")
            );
            for (let i = 0; i < pendingFiles.length; i++) {
              await uploadImage(pendingFiles[i], {
                entityType: "catalog.product",
                entityId: String(newId),
                imageType: blobImgs[i]?.type || "gallery",
              });
            }
          } finally {
            setUploading(false);
          }
        }
        toast.success("Товар создан");
        onOpenChange(false);
        invalidateProducts();
        onSaved();
      }
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setCategorySearch("");
      setCategoryDropdownOpen(false);
      setSelectedCategoryName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Редактировать товар" : "Новый товар"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Название <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editingId ? f.slug : generateSlug(name),
                  }));
                  clearFieldError("name");
                  if (!editingId) clearFieldError("slug");
                }}
                placeholder="Смартфон XYZ Pro 256GB"
                className={`bg-muted/50 ${fieldErrors.name ? "border-destructive" : ""}`}
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Slug <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, slug: e.target.value }));
                    clearFieldError("slug");
                  }}
                  placeholder="smartphone-xyz"
                  className={`bg-muted/50 font-mono text-sm ${fieldErrors.slug || slugExists ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Регенерировать уникальный слаг из названия"
                  onClick={async () => {
                    const slug = await generateUniqueSlug(form.name, (s) =>
                      checkProductSlugExists(s, editingId ?? undefined)
                    );
                    setForm((f) => ({ ...f, slug }));
                    clearFieldError("slug");
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-5 text-xs">
                {slugChecking && (
                  <p className="text-muted-foreground">Проверка слага...</p>
                )}
                {!slugChecking && fieldErrors.slug && (
                  <p className="text-destructive">{fieldErrors.slug}</p>
                )}
                {!slugChecking && !fieldErrors.slug && slugExists && (
                  <p className="text-destructive">Слаг уже используется</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Полное название</Label>
            <Input
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
              placeholder="Смартфон XYZ Pro 256GB"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Артикул (SKU)</Label>
            <Input
              value={form.sku}
              onChange={(e) =>
                setForm((f) => ({ ...f, sku: e.target.value }))
              }
              placeholder="ABC-12345"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Описание товара..."
              className="bg-muted/50 resize-none"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Цена <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => {
                  setForm((f) => ({ ...f, price: e.target.value }));
                  clearFieldError("price");
                }}
                placeholder="9990"
                className={`bg-muted/50 ${fieldErrors.price ? "border-destructive" : ""}`}
              />
              {fieldErrors.price && (
                <p className="text-sm text-destructive">{fieldErrors.price}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Категория <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={
                    form.categoryId
                      ? (selectedCategoryName ||
                          categories.find(
                            (c) => c.id === Number(form.categoryId)
                          )?.name) ??
                        categorySearch
                      : categorySearch
                  }
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setCategoryDropdownOpen(true);
                    setCategorySearchPage(1);
                    if (form.categoryId) {
                      setForm((f) => ({ ...f, categoryId: "" }));
                      setSelectedCategoryName("");
                    }
                    clearFieldError("categoryId");
                  }}
                  onFocus={() => setCategoryDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setCategoryDropdownOpen(false), 200)
                  }
                  placeholder="Поиск по имени или slug..."
                  className={`pl-9 bg-muted/50 ${fieldErrors.categoryId ? "border-destructive" : ""}`}
                />
                {categoryDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover shadow-lg max-h-48 overflow-auto"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {categorySearchLoading ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        Поиск…
                      </div>
                    ) : categorySearchResults.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {debouncedCategorySearch.trim()
                          ? "Нет подходящих категорий"
                          : "Введите имя или slug для поиска"}
                      </div>
                    ) : (
                      <>
                        <ul className="p-1">
                          {categorySearchResults.map((cat) => (
                            <li key={cat.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent focus:bg-accent focus:outline-none cursor-pointer"
                                onClick={() => {
                                  setForm((f) => ({
                                    ...f,
                                    categoryId: String(cat.id),
                                  }));
                                  setSelectedCategoryName(cat.name || "");
                                  setCategorySearch("");
                                  setCategoryDropdownOpen(false);
                                  clearFieldError("categoryId");
                                }}
                              >
                                {cat.name}
                                {cat.slug && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    {cat.slug}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                        {categorySearchTotalPages > 1 && (
                          <div className="flex items-center justify-between gap-2 px-2 py-2 border-t text-sm">
                            <span className="text-muted-foreground">
                              {categorySearchTotal} всего
                            </span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                disabled={categorySearchPage <= 1}
                                onClick={() =>
                                  setCategorySearchPage((p) =>
                                    Math.max(1, p - 1)
                                  )
                                }
                              >
                                Назад
                              </Button>
                              <span className="flex items-center px-2 text-muted-foreground">
                                {categorySearchPage} /{" "}
                                {categorySearchTotalPages}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                disabled={
                                  categorySearchPage >=
                                  categorySearchTotalPages
                                }
                                onClick={() =>
                                  setCategorySearchPage((p) =>
                                    Math.min(
                                      categorySearchTotalPages,
                                      p + 1
                                    )
                                  )
                                }
                              >
                                Вперёд
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {fieldErrors.categoryId && (
                <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>
              )}
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Изображения</Label>
            <div className="border border-dashed border-border/70 rounded-xl p-4 space-y-3">
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-lg bg-muted overflow-hidden group/img border border-border"
                    >
                      <img
                        src={
                          img.url.startsWith("blob:")
                            ? img.url
                            : getImageUrl(img.url)
                        }
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const wrapper = e.currentTarget.closest("[class*='relative']");
                          if (wrapper instanceof HTMLElement) wrapper.style.display = "none";
                        }}
                      />
                      {img.type === "main" && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[10px] font-medium flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Главное
                        </span>
                      )}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setMainImage(idx)}
                          title="Сделать главным"
                          className="w-5 h-5 bg-muted hover:bg-amber-500 rounded-full flex items-center justify-center text-muted-foreground hover:text-white cursor-pointer"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div
                className="flex flex-col items-center gap-2 py-4 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Нажмите для загрузки
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        PNG, JPG, WebP
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Variants Section */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Варианты</Label>
              {!editingId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={addLocalGroup}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Добавить группу
                </Button>
              )}
            </div>

            {editingId ? (
              /* Edit mode — full CRUD via API */
              <VariantManager ref={variantManagerRef} productId={editingId} />
            ) : localGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Нет вариантов. Нажмите «Добавить группу» чтобы добавить (например: Размер, Цвет).
              </p>
            ) : (
              /* Create mode — local inline editor */
              <div className="space-y-3">
                {localGroups.map((group) => {
                  const isExpanded = expandedLocalGroups.has(group._key);
                  return (
                    <div
                      key={group._key}
                      className="rounded-lg border border-border/50 bg-card/80 overflow-hidden"
                    >
                      {/* Group header */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => toggleLocalGroup(group._key)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <Input
                          value={group.name}
                          onChange={(e) =>
                            updateLocalGroup(group._key, { name: e.target.value })
                          }
                          placeholder="Название группы (Размер, Цвет...)"
                          className="bg-muted/50 h-8 text-sm flex-1"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <Switch
                            checked={group.isRequired}
                            onCheckedChange={(v) =>
                              updateLocalGroup(group._key, { isRequired: v })
                            }
                            size="sm"
                          />
                          Обяз.
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLocalGroup(group._key)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Options (expanded) */}
                      {isExpanded && (
                        <div className="border-t border-border/30 px-3 py-2 space-y-2">
                          {group.options.map((opt, oi) => (
                            <div
                              key={opt._key}
                              className="flex items-center gap-2"
                            >
                              <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                                {oi + 1}.
                              </span>
                              <Input
                                value={opt.name}
                                onChange={(e) =>
                                  updateLocalOption(group._key, opt._key, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Название (S, M, L...)"
                                className="bg-muted/50 h-7 text-xs flex-1"
                              />
                              <Input
                                type="number"
                                value={opt.priceDelta || ""}
                                onChange={(e) =>
                                  updateLocalOption(group._key, opt._key, {
                                    priceDelta: Number(e.target.value) || 0,
                                  })
                                }
                                placeholder="± ₽"
                                title="Надбавка или скидка к базовой цене товара"
                                className="bg-muted/50 h-7 text-xs w-24"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  removeLocalOption(group._key, opt._key)
                                }
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => addLocalOption(group._key)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Опция
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
            >
              {saving ? "Сохранение..." : editingId ? "Обновить" : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
