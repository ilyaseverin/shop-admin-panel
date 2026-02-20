"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  getImageUrl,
  checkProductSlugExists,
} from "@/lib/api";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Star,
  Image as ImageIcon,
  Search,
  RefreshCw,
} from "lucide-react";

interface ProductImage {
  url: string;
  type: string;
}

interface Product {
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

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ProductForm {
  name: string;
  fullName: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  sortOrder: string;
}

const emptyForm: ProductForm = {
  name: "",
  fullName: "",
  slug: "",
  description: "",
  price: "",
  categoryId: "",
  sortOrder: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [slugExists, setSlugExists] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload state: при создании файлы грузятся при Save; при редактировании — сразу
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        getProducts(),
        getCategories({ page: 1, limit: 100 }),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(catData?.items || []);
    } catch {
      toast.error("Ошибка загрузки данных");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setUploadedImages([]);
    setPendingFiles([]);
    setSlugExists(false);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      fullName: product.fullName || "",
      slug: product.slug || "",
      description: product.description || "",
      price: String(product.price || ""),
      categoryId: String(product.categoryId || ""),
      sortOrder: String(product.sortOrder || ""),
    });
    setUploadedImages(product.images || []);
    setPendingFiles([]);
    setSlugExists(false);
    setDialogOpen(true);
  };

  // Проверка занятости слага (с debounce)
  useEffect(() => {
    if (!dialogOpen || !form.slug?.trim()) {
      setSlugExists(false);
      return;
    }
    const t = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const exists = await checkProductSlugExists(form.slug.trim(), editingId ?? undefined);
        setSlugExists(exists);
      } catch {
        setSlugExists(false);
      } finally {
        setSlugChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [dialogOpen, form.slug, editingId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const blobUrl = URL.createObjectURL(file);
      setPendingFiles((prev) => [...prev, file]);
      setUploadedImages((prev) => [
        ...prev,
        { url: blobUrl, type: "product" },
      ]);
    }
    toast.success("Изображение добавлено (загрузится при сохранении)");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const removed = prev[index];
      const isBlob = removed?.url.startsWith("blob:");
      if (isBlob && removed) URL.revokeObjectURL(removed.url);
      const blobIndex =
        isBlob ? prev.slice(0, index).filter((img) => img.url.startsWith("blob:")).length : -1;
      if (blobIndex >= 0) setPendingFiles((p) => p.filter((_, i) => i !== blobIndex));
      return prev.filter((_, i) => i !== index);
    });
  };

  const setMainImage = (index: number) => {
    setUploadedImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        type: i === index ? "main" : "product",
      }))
    );
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.price || !form.categoryId) {
      toast.error("Заполните обязательные поля (Имя, Slug, Цена, Категория)");
      return;
    }
    if (slugExists) {
      toast.error("Этот слаг уже используется. Выберите другой.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        price: Number(form.price),
        categoryId: Number(form.categoryId),
        fullName: form.fullName || undefined,
        description: form.description || undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        const blobImages = uploadedImages.filter((img) => img.url.startsWith("blob:"));
        if (pendingFiles.length > 0) {
          setUploading(true);
          try {
            for (let i = 0; i < pendingFiles.length; i++) {
              await uploadImage(pendingFiles[i], {
                entityType: "catalog.product",
                entityId: String(editingId),
                imageType: blobImages[i]?.type || "product",
              });
            }
          } finally {
            setUploading(false);
          }
        }
        toast.success("Товар обновлён");
        setDialogOpen(false);
        loadData(true);
      } else {
        const created = await createProduct(payload);
        const newId = created?.id ?? created?.data?.id;
        if (newId == null) {
          toast.success("Товар создан");
          setDialogOpen(false);
          loadData(true);
          return;
        }
        if (pendingFiles.length > 0) {
          setUploading(true);
          try {
            const blobImages = uploadedImages.filter((img) => img.url.startsWith("blob:"));
            for (let i = 0; i < pendingFiles.length; i++) {
              await uploadImage(pendingFiles[i], {
                entityType: "catalog.product",
                entityId: String(newId),
                imageType: blobImages[i]?.type || "product",
              });
            }
          } finally {
            setUploading(false);
          }
        }
        toast.success("Товар создан");
        setDialogOpen(false);
        loadData(true);
      }
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteId);
      toast.success("Товар удалён");
      setDeleteId(null);
      loadData(true);
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryName = (id: number) => {
    return categories.find((c) => c.id === id)?.name || `#${id}`;
  };

  const filteredProducts = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Товары</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Управление товарами магазина
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-24">Цена</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="w-16">Фото</TableHead>
              <TableHead className="w-24 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  Товары не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.id}
                  </TableCell>
                  <TableCell
                    className="font-medium max-w-[200px] truncate"
                    title={product.name}
                  >
                    {product.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs max-w-[150px] truncate block"
                      title={product.slug}
                    >
                      {product.slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {product.price?.toLocaleString("ru-RU")} ₽
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs border-indigo-500/30 text-indigo-400"
                    >
                      {getCategoryName(product.categoryId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.images?.length > 0 ? (
                      <div className="flex -space-x-1">
                        {product.images.slice(0, 3).map((img, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-md bg-muted border-2 border-card overflow-hidden"
                          >
                            <img
                              src={getImageUrl(img.url)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {product.images.length > 3 && (
                          <div className="w-7 h-7 rounded-md bg-muted border-2 border-card flex items-center justify-center text-[10px] text-muted-foreground">
                            +{product.images.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(product)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(product.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать товар" : "Новый товар"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editingId ? f.slug : generateSlug(name),
                    }));
                  }}
                  placeholder="Смартфон XYZ"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    placeholder="smartphone-xyz"
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Регенерировать уникальный слаг из названия"
                    onClick={async () => {
                      const slug = await generateUniqueSlug(form.name, (s) =>
                        checkProductSlugExists(s, editingId ?? undefined),
                      );
                      setForm((f) => ({ ...f, slug }));
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-5 text-xs">
                  {slugChecking && (
                    <p className="text-muted-foreground">Проверка слага...</p>
                  )}
                  {!slugChecking && slugExists && (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Цена *</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="9990"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Категория *</Label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Выберите...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Сортировка</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: e.target.value }))
                  }
                  placeholder="0"
                  className="bg-muted/50"
                />
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
                            className="w-5 h-5 bg-muted hover:bg-amber-500 rounded-full flex items-center justify-center text-muted-foreground hover:text-white"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white"
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

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
              >
                {saving ? "Сохранение..." : editingId ? "Обновить" : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Удалить товар?"
        description="Товар будет удалён навсегда. Это действие нельзя отменить."
      />
    </div>
  );
}
