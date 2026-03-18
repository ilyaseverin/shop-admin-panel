"use client";

import { useEffect, useState, useRef } from "react";
import {
  createCategory,
  updateCategory,
  checkCategorySlugExists,
  uploadImage,
  getImageUrl,
  deleteImage,
  getImageDetails,
  updateImage,
} from "@/lib/api";
import { invalidateCategories } from "@/lib/swr";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Upload, X } from "lucide-react";
import type { Category, CategoryForm, CategoryImage } from "../types";
import { emptyCategoryForm, CATEGORY_IMAGE_TYPES } from "../types";

const SLUG_CHECK_DELAY_MS = 400;

type FieldErrors = Partial<Record<keyof CategoryForm, string>>;

function validate(form: CategoryForm, slugExists: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Введите название категории";
  if (!form.slug.trim()) errors.slug = "Введите slug";
  else if (slugExists) errors.slug = "Слаг уже используется";
  return errors;
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  allCategories: Category[];
  onSaved: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  allCategories,
  onSaved,
}: CategoryFormDialogProps) {
  const editingId = category?.id ?? null;
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm);
  const [saving, setSaving] = useState(false);
  const [slugExists, setSlugExists] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Image state
  const [uploadedImages, setUploadedImages] = useState<CategoryImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageDataRef = useRef<Map<string, { type: string; title: string; description: string }>>(new Map());
  const pendingDeletesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitted(false);
    originalImageDataRef.current = new Map();
    pendingDeletesRef.current = [];
    if (category) {
      setForm({
        name: category.name || "",
        fullName: category.fullName || "",
        slug: category.slug || "",
        description: category.description || "",
        parentId: category.parentId ? String(category.parentId) : "",
        sortOrder: "",
      });
      const images = category.images || [];
      setUploadedImages(images);
      setPendingFiles([]);
      if (images.length > 0) {
        Promise.all(
          images.map(async (img) => {
            try {
              const details = await getImageDetails("catalog.category.image", img.url);
              return {
                url: img.url,
                type: details.imageType || img.type,
                title: details.title || "",
                description: details.description || "",
              };
            } catch {
              return null;
            }
          })
        ).then((results) => {
          const valid = results.filter(
            (r): r is NonNullable<typeof r> => r !== null,
          ) as CategoryImage[];
          const map = new Map<string, { type: string; title: string; description: string }>();
          for (const img of valid) {
            map.set(img.url, { type: img.type, title: img.title || "", description: img.description || "" });
          }
          originalImageDataRef.current = map;
          setUploadedImages(valid);
        });
      }
    } else {
      setForm(emptyCategoryForm);
      setUploadedImages([]);
      setPendingFiles([]);
    }
    setSlugExists(false);
  }, [open, category]);

  useEffect(() => {
    if (!open || !form.slug?.trim()) {
      setSlugExists(false);
      return;
    }
    setSlugExists(false);
    const t = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const exists = await checkCategorySlugExists(
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

  const updateField = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const updateImageField = (index: number, patch: Partial<CategoryImage>) => {
    setUploadedImages((prev) => {
      const next = [...prev];
      // Both category types are unique — swap if already taken
      if (patch.type) {
        const prevOwner = next.findIndex((im, i) => i !== index && im.type === patch.type);
        if (prevOwner !== -1) {
          next[prevOwner] = { ...next[prevOwner], type: next[index].type };
        }
      }
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const blobUrl = URL.createObjectURL(file);
      setPendingFiles((prev) => [...prev, file]);
      setUploadedImages((prev) => {
        const hasMain = prev.some((img) => img.type === "main");
        const hasBg = prev.some((img) => img.type === "background");
        const type = !hasMain ? "main" : !hasBg ? "background" : "main";
        return [...prev, { url: blobUrl, type, title: "", description: "" }];
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const removed = uploadedImages[index];
    if (!removed) return;

    if (removed.url.startsWith("blob:")) {
      URL.revokeObjectURL(removed.url);
      const blobIndex = uploadedImages
        .slice(0, index)
        .filter((img) => img.url.startsWith("blob:")).length;
      setPendingFiles((p) => p.filter((_, i) => i !== blobIndex));
    } else {
      pendingDeletesRef.current.push(removed.url);
    }
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSubmitted(true);
    const fieldErrors = validate(form, slugExists);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        fullName: form.fullName || undefined,
        description: form.description || undefined,
        parentId:
          form.parentId && form.parentId !== "0"
            ? Number(form.parentId)
            : undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      };

      if (editingId) {
        await updateCategory(editingId, payload);

        // Delete queued images
        for (const externalId of pendingDeletesRef.current) {
          await deleteImage("catalog.category.image", externalId);
        }
        pendingDeletesRef.current = [];

        // Upload new images
        const blobImages = uploadedImages.filter((img) => img.url.startsWith("blob:"));
        if (pendingFiles.length > 0) {
          setUploading(true);
          try {
            for (let i = 0; i < pendingFiles.length; i++) {
              const blobImg = blobImages[i];
              await uploadImage(pendingFiles[i], {
                topic: "catalog.category.image",
                entityType: "catalog.category",
                entityId: String(editingId),
                imageType: blobImg?.type || "main",
                title: blobImg?.title || undefined,
                description: blobImg?.description || undefined,
              });
            }
          } finally {
            setUploading(false);
          }
        }

        // Update changed image data (server images only)
        const origData = originalImageDataRef.current;
        for (const img of uploadedImages) {
          if (img.url.startsWith("blob:")) continue;
          const orig = origData.get(img.url);
          if (orig && (orig.type !== img.type || orig.title !== (img.title || "") || orig.description !== (img.description || ""))) {
            await updateImage("catalog.category.image", img.url, {
              imageType: img.type,
              title: img.title || undefined,
              description: img.description || undefined,
            });
          }
        }

        toast.success("Категория обновлена");
      } else {
        const created = await createCategory(payload);
        const newId = created?.id ?? (created as { data?: { id?: number } })?.data?.id;

        if (newId != null && pendingFiles.length > 0) {
          setUploading(true);
          try {
            const blobImgs = uploadedImages.filter((img) => img.url.startsWith("blob:"));
            for (let i = 0; i < pendingFiles.length; i++) {
              const blobImg = blobImgs[i];
              await uploadImage(pendingFiles[i], {
                topic: "catalog.category.image",
                entityType: "catalog.category",
                entityId: String(newId),
                imageType: blobImg?.type || "main",
                title: blobImg?.title || undefined,
                description: blobImg?.description || undefined,
              });
            }
          } finally {
            setUploading(false);
          }
        }

        toast.success("Категория создана");
      }
      onOpenChange(false);
      invalidateCategories();
      onSaved();
      // Delayed re-invalidation for Kafka image propagation
      setTimeout(() => invalidateCategories(), 2000);
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const slugError = errors.slug || (slugExists ? "Слаг уже используется" : "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Редактировать категорию" : "Новая категория"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Имя <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  updateField("name", name);
                  if (!editingId) {
                    updateField("slug", generateSlug(name));
                  }
                }}
                placeholder="Электроника и гаджеты"
                className={`bg-muted/50 ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Slug <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="electronics"
                  className={`bg-muted/50 font-mono text-sm ${slugError ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Регенерировать уникальный слаг из названия"
                  onClick={async () => {
                    const slug = await generateUniqueSlug(form.name, (s) =>
                      checkCategorySlugExists(s, editingId ?? undefined)
                    );
                    updateField("slug", slug);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-5 text-xs">
                {slugChecking && (
                  <p className="text-muted-foreground">Проверка слага...</p>
                )}
                {!slugChecking && slugError && (
                  <p className="text-destructive">{slugError}</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Полное имя</Label>
            <Input
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Электроника и гаджеты"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Описание категории..."
              className="bg-muted/50 resize-none"
              rows={3}
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Изображения</Label>
            <div className="border border-dashed border-border/70 rounded-xl p-4 space-y-3">
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-48 rounded-lg border border-border bg-card/80 overflow-hidden"
                    >
                      <div className="relative w-full h-32 bg-muted">
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
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2 space-y-1.5">
                        <Select
                          value={img.type}
                          onValueChange={(val) => updateImageField(idx, { type: val })}
                        >
                          <SelectTrigger className="h-7 text-xs bg-muted/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_IMAGE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={img.title || ""}
                          onChange={(e) => updateImageField(idx, { title: e.target.value })}
                          placeholder="Заголовок"
                          className="h-7 text-xs bg-muted/50"
                        />
                        <Input
                          value={img.description || ""}
                          onChange={(e) => updateImageField(idx, { description: e.target.value })}
                          placeholder="Описание"
                          className="h-7 text-xs bg-muted/50"
                        />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Родительская категория</Label>
              <Select
                value={form.parentId || "0"}
                onValueChange={(val) =>
                  updateField("parentId", val === "0" ? "" : val)
                }
              >
                <SelectTrigger className="bg-muted/50 w-full overflow-hidden">
                  <SelectValue placeholder="Выберите родителя..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <span className="text-muted-foreground italic">
                      Корневая категория (без родителя)
                    </span>
                  </SelectItem>
                  {allCategories
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1 max-w-full leading-relaxed">
                Выберите категорию, в которую будет вложена текущая
              </p>
            </div>
            <div className="space-y-2">
              <Label>Сортировка</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => updateField("sortOrder", e.target.value)}
                placeholder="0"
                className="bg-muted/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            >
              {saving ? "Сохранение..." : editingId ? "Обновить" : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
