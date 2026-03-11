"use client";

import { useEffect, useState } from "react";
import {
  createCategory,
  updateCategory,
  checkCategorySlugExists,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { Category, CategoryForm } from "../types";
import { emptyCategoryForm } from "../types";

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

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitted(false);
    if (category) {
      setForm({
        name: category.name || "",
        fullName: category.fullName || "",
        slug: category.slug || "",
        description: category.description || "",
        parentId: category.parentId ? String(category.parentId) : "",
        sortOrder: "",
      });
    } else {
      setForm(emptyCategoryForm);
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
        toast.success("Категория обновлена");
      } else {
        await createCategory(payload);
        toast.success("Категория создана");
      }
      onOpenChange(false);
      onSaved();
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
