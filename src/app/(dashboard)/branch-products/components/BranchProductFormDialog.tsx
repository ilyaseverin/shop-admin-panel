"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/lib/utils";
import {
  getProducts,
  getAllBranchProducts,
  createBranchProduct,
  updateBranchProduct,
} from "@/lib/api";
import { invalidateBranchProducts } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, ArrowDownToLine } from "lucide-react";
import type { BranchProduct, Product, Branch, Category } from "../types";

const PRODUCT_SEARCH_LIMIT = 10;

type FieldErrors = Partial<
  Record<"branchId" | "productId" | "price" | "duplicate", string>
>;

function validateCreate(
  formBranchId: string,
  formProductId: string,
  formPrice: string,
  allBranchProducts: BranchProduct[],
): FieldErrors {
  const errors: FieldErrors = {};
  if (!formBranchId) errors.branchId = "Выберите филиал";
  if (!formProductId) errors.productId = "Выберите товар";
  if (!formPrice.trim()) {
    errors.price = "Укажите цену";
  } else {
    const price = Number(formPrice);
    if (Number.isNaN(price) || price < 0) errors.price = "Укажите корректную цену";
  }
  if (formBranchId && formProductId) {
    const exists = allBranchProducts.some(
      (bp) =>
        bp.branchId === Number(formBranchId) &&
        bp.productId === Number(formProductId),
    );
    if (exists) errors.duplicate = "Этот товар уже привязан к выбранному филиалу";
  }
  return errors;
}

function validateEdit(formPrice: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!formPrice.trim()) {
    errors.price = "Укажите цену";
  } else {
    const price = Number(formPrice);
    if (Number.isNaN(price) || price < 0) errors.price = "Укажите корректную цену";
  }
  return errors;
}

interface BranchProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: BranchProduct | null;
  branches: Branch[];
  products: Product[];
  categories: Category[];
  onSaved: () => void;
}

export function BranchProductFormDialog({
  open,
  onOpenChange,
  editingItem,
  branches,
  products,
  categories,
  onSaved,
}: BranchProductFormDialogProps) {
  const editingId = editingItem?.id ?? null;

  const [formBranchId, setFormBranchId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("0");
  const [formIsActive, setFormIsActive] = useState(true);

  const [productSearch, setProductSearch] = useState("");
  const [productListOpen, setProductListOpen] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState<Product[]>(
    [],
  );
  const [productSearchPage, setProductSearchPage] = useState(1);
  const [productSearchTotal, setProductSearchTotal] = useState(0);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allBranchProducts, setAllBranchProducts] = useState<BranchProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const debouncedProductSearch = useDebounce(productSearch, 300);
  const productSearchTotalPages =
    Math.ceil(productSearchTotal / PRODUCT_SEARCH_LIMIT) || 1;

  const getBranchName = (id: number) =>
    branches.find((b) => b.id === id)?.name ?? `#${id}`;
  const getProductName = (id: number) =>
    products.find((p) => p.id === id)?.name ?? `#${id}`;
  const getCategoryName = (id: number) =>
    categories.find((c) => c.id === id)?.name ?? "";

  const clearFieldError = (key: keyof FieldErrors) => {
    if (submitted) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next.duplicate;
        return next;
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setSubmitted(false);
    if (editingItem) {
      setFormBranchId(String(editingItem.branchId));
      setFormProductId(String(editingItem.productId));
      setFormPrice(String(editingItem.price));
      setFormStock(String(editingItem.stock));
      setFormIsActive(editingItem.isActive);
      setSelectedProduct(null);
    } else {
      setFormBranchId("");
      setFormProductId("");
      setFormPrice("");
      setFormStock("0");
      setFormIsActive(true);
      setProductSearch("");
      setProductListOpen(false);
      setProductSearchPage(1);
      setProductSearchResults([]);
      setSelectedProduct(null);
      getAllBranchProducts()
        .then(setAllBranchProducts)
        .catch(() => setAllBranchProducts([]));
    }
  }, [open, editingItem]);

  useEffect(() => {
    if (!productListOpen) return;
    const q = debouncedProductSearch.trim();
    let cancelled = false;
    setProductSearchLoading(true);
    getProducts({
      page: productSearchPage,
      limit: PRODUCT_SEARCH_LIMIT,
      name: q || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        const items = res.items ?? [];
        const total =
          (res.meta as { total?: number } | undefined)?.total ?? items.length;
        setProductSearchResults(items as Product[]);
        setProductSearchTotal(total);
      })
      .catch((err) => {
        if (!cancelled) {
          setProductSearchResults([]);
          console.error("[ProductSearch] error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setProductSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productListOpen, debouncedProductSearch, productSearchPage]);

  const selectProduct = (p: Product) => {
    setFormProductId(String(p.id));
    setProductSearch(p.name || "");
    setProductListOpen(false);
    setFormPrice(String(p.price ?? 0));
    setSelectedProduct(p);
    clearFieldError("productId");
  };

  const clearProduct = () => {
    setFormProductId("");
    setProductSearch("");
    setSelectedProduct(null);
  };

  const pullPriceFromProduct = () => {
    if (!formProductId) {
      toast.error("Сначала выберите товар");
      return;
    }
    const p = selectedProduct ?? products.find((pr) => pr.id === Number(formProductId));
    setFormPrice(String(p?.price ?? 0));
    clearFieldError("price");
    toast.success("Цена подставлена из товара");
  };

  const handleSave = async () => {
    setSubmitted(true);

    if (editingId) {
      const errs = validateEdit(formPrice);
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) return;

      const price = Number(formPrice);
      setSaving(true);
      try {
        await updateBranchProduct(editingId, {
          price,
          stock: formStock ? Number(formStock) : undefined,
          isActive: formIsActive,
        });
        toast.success("Товар в филиале обновлён");
        onOpenChange(false);
        invalidateBranchProducts();
        onSaved();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка сохранения";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
      return;
    }

    const errs = validateCreate(formBranchId, formProductId, formPrice, allBranchProducts);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const price = Number(formPrice);
    const branchId = Number(formBranchId);
    const productId = Number(formProductId);
    setSaving(true);
    try {
      await createBranchProduct({
        branchId,
        productId,
        price,
        stock: formStock ? Number(formStock) : undefined,
        isActive: formIsActive,
      });
      toast.success("Товар привязан к филиалу");
      onOpenChange(false);
      invalidateBranchProducts();
      onSaved();
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 409) {
        toast.error(
          "Такая привязка уже есть. Возможно, удаление на сервере не сработало — обновите страницу (F5) и попробуйте снова.",
        );
        onSaved();
      } else {
        toast.error("Ошибка привязки");
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCategoryId = selectedProduct?.categoryId
    ?? products.find((p) => p.id === Number(formProductId))?.categoryId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId
              ? "Редактировать товар в филиале"
              : "Привязать товар к филиалу"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {editingId && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Филиал:{" "}
              <span className="font-medium text-foreground">
                {getBranchName(Number(formBranchId))}
              </span>
              {" · "}
              Товар:{" "}
              <span className="font-medium text-foreground">
                {getProductName(Number(formProductId))}
              </span>
            </div>
          )}
          {!editingId && (
            <>
              <div className="space-y-2">
                <Label>
                  Филиал <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formBranchId}
                  onValueChange={(val) => {
                    setFormBranchId(val);
                    clearFieldError("branchId");
                  }}
                >
                  <SelectTrigger className={`w-full ${fieldErrors.branchId ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    className="z-[100] w-[var(--radix-select-trigger-width)]"
                  >
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.branchId && (
                  <p className="text-sm text-destructive">{fieldErrors.branchId}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Товар <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Введите название или slug — список появится ниже"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductListOpen(true);
                      setProductSearchPage(1);
                      if (formProductId) {
                        setFormProductId("");
                        setSelectedProduct(null);
                      }
                      clearFieldError("productId");
                    }}
                    onFocus={() => setProductListOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setProductListOpen(false), 150)
                    }
                    className={`pl-9 pr-8 ${fieldErrors.productId ? "border-destructive" : ""}`}
                  />
                  {formProductId && (
                    <button
                      type="button"
                      onClick={clearProduct}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Сбросить товар"
                    >
                      ×
                    </button>
                  )}
                  {productListOpen && (
                    <div
                      className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-56 overflow-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {productSearchLoading ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          Поиск…
                        </div>
                      ) : !debouncedProductSearch.trim() ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          Введите название или slug товара для поиска
                        </div>
                      ) : productSearchResults.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          Нет подходящих товаров (если ошибка повторяется —
                          проверьте доступность сервера)
                        </div>
                      ) : (
                        <>
                          <ul className="p-1">
                            {productSearchResults.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent focus:bg-accent focus:outline-none flex justify-between items-center cursor-pointer"
                                  onClick={() => selectProduct(p)}
                                >
                                  <span>{p.name}</span>
                                  <span className="text-muted-foreground tabular-nums">
                                    {Number(p.price ?? 0).toLocaleString(
                                      "ru-RU",
                                    )}{" "}
                                    ₽
                                  </span>
                                </button>
                              </li>
                            ))}
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
                                    setProductSearchPage((p) =>
                                      Math.max(1, p - 1),
                                    )
                                  }
                                >
                                  Назад
                                </Button>
                                <span className="flex items-center px-2 text-muted-foreground">
                                  {productSearchPage} /{" "}
                                  {productSearchTotalPages}
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
                {fieldErrors.productId && (
                  <p className="text-sm text-destructive">{fieldErrors.productId}</p>
                )}
                {fieldErrors.duplicate && (
                  <p className="text-sm text-destructive">{fieldErrors.duplicate}</p>
                )}
                {formProductId && selectedCategoryId && (
                  <p className="text-sm text-muted-foreground">
                    Категория:{" "}
                    <span className="text-foreground">
                      {getCategoryName(selectedCategoryId) || "—"}
                    </span>
                  </p>
                )}
              </div>
            </>
          )}
          <div className="flex items-end gap-2">
            <div className="space-y-2 flex-1">
              <Label>
                Цена в филиале <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formPrice}
                onChange={(e) => {
                  setFormPrice(e.target.value);
                  clearFieldError("price");
                }}
                placeholder="0"
                className={fieldErrors.price ? "border-destructive" : ""}
              />
              {fieldErrors.price && (
                <p className="text-sm text-destructive">{fieldErrors.price}</p>
              )}
            </div>
            {!editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={pullPriceFromProduct}
                title="Подтянуть цену из товара"
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                Из товара
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Остаток (склад)</Label>
            <Input
              type="number"
              min={0}
              value={formStock}
              onChange={(e) => setFormStock(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={formIsActive}
              onCheckedChange={setFormIsActive}
            />
            <Label htmlFor="isActive">Активен в филиале</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение…" : editingId ? "Сохранить" : "Привязать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
