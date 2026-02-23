"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useDebounce } from "@/lib/utils";
import {
  getAllBranchProducts,
  getProducts,
  getProductsAll,
  getBranches,
  getCategories,
  createBranchProduct,
  updateBranchProduct,
  deleteBranchProduct,
  restoreBranchProduct,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowDownToLine } from "lucide-react";

interface BranchProduct {
  id: number;
  productId: number;
  branchId: number;
  price: number;
  stock: number;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  fullName?: string;
  slug: string;
  price: number;
  categoryId: number;
}

interface Branch {
  id: number;
  name: string;
  address: string;
}

interface Category {
  id: number;
  name: string;
}

export default function BranchProductsPage() {
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  /** Фильтр по статусу: по умолчанию только активные привязки. */
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [formBranchId, setFormBranchId] = useState<string>("");
  const [formProductId, setFormProductId] = useState<string>("");
  const [formPrice, setFormPrice] = useState<string>("");
  const [formStock, setFormStock] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productListOpen, setProductListOpen] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [productSearchPage, setProductSearchPage] = useState(1);
  const [productSearchTotal, setProductSearchTotal] = useState(0);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const productSearchLimit = 10;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bpRes, prodRes, branchRes, catRes] = await Promise.all([
        getAllBranchProducts(),
        getProductsAll(),
        getBranches({ isActive: true }),
        getCategories({ page: 1, limit: 500 }),
      ]);
      setBranchProducts(Array.isArray(bpRes) ? bpRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setBranches(Array.isArray(branchRes) ? branchRes : []);
      setCategories(catRes?.items ?? []);
    } catch {
      toast.error("Ошибка загрузки данных");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const debouncedProductSearch = useDebounce(productSearch, 300);

  useEffect(() => {
    if (!productListOpen) return;
    const q = debouncedProductSearch.trim();
    let cancelled = false;
    setProductSearchLoading(true);
    getProducts({
      page: productSearchPage,
      limit: productSearchLimit,
      name: q || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        const items = res.items ?? [];
        const total = (res.meta as { total?: number } | undefined)?.total ?? items.length;
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
  }, [productListOpen, debouncedProductSearch, productSearchPage]);

  const filteredByBranch = useMemo(() => {
    if (branchFilter === "all") return branchProducts;
    const id = Number(branchFilter);
    return branchProducts.filter((bp) => bp.branchId === id);
  }, [branchProducts, branchFilter]);

  const filteredByBranchAndStatus = useMemo(() => {
    if (statusFilter === "active")
      return filteredByBranch.filter((bp) => bp.isActive);
    if (statusFilter === "inactive")
      return filteredByBranch.filter((bp) => !bp.isActive);
    return filteredByBranch;
  }, [filteredByBranch, statusFilter]);

  const productSearchTotalPages = Math.ceil(productSearchTotal / productSearchLimit) || 1;

  const getBranchName = (id: number) =>
    branches.find((b) => b.id === id)?.name ?? `#${id}`;
  const getProductName = (id: number) =>
    products.find((p) => p.id === id)?.name ?? `#${id}`;
  const getProductPrice = (id: number) =>
    products.find((p) => p.id === id)?.price ?? 0;
  const getCategoryName = (id: number) =>
    categories.find((c) => c.id === id)?.name ?? "";

  const openCreate = () => {
    setEditingId(null);
    setFormBranchId("");
    setFormProductId("");
    setFormPrice("");
    setFormStock("0");
    setFormIsActive(true);
    setProductSearch("");
    setProductListOpen(false);
    setProductSearchPage(1);
    setProductSearchResults([]);
    setDialogOpen(true);
  };

  const selectProduct = (p: Product) => {
    setFormProductId(String(p.id));
    setProductSearch(p.name || "");
    setProductListOpen(false);
    setFormPrice(String(p.price));
  };

  const clearProduct = () => {
    setFormProductId("");
    setProductSearch("");
  };

  const openEdit = (bp: BranchProduct) => {
    setEditingId(bp.id);
    setFormBranchId(String(bp.branchId));
    setFormProductId(String(bp.productId));
    setFormPrice(String(bp.price));
    setFormStock(String(bp.stock));
    setFormIsActive(bp.isActive);
    setDialogOpen(true);
  };

  const pullPriceFromProduct = () => {
    if (!formProductId) {
      toast.error("Сначала выберите товар");
      return;
    }
    const price = getProductPrice(Number(formProductId));
    setFormPrice(String(price));
    toast.success("Цена подставлена из товара");
  };

  const handleSave = async () => {
    if (editingId) {
      const price = Number(formPrice);
      if (Number.isNaN(price) || price < 0) {
        toast.error("Укажите корректную цену");
        return;
      }
      setSaving(true);
      try {
        await updateBranchProduct(editingId, {
          price,
          stock: formStock ? Number(formStock) : undefined,
          isActive: formIsActive,
        });
        toast.success("Товар в филиале обновлён");
        setDialogOpen(false);
        loadData(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка сохранения";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!formBranchId || !formProductId || !formPrice.trim()) {
      toast.error("Выберите филиал, товар и укажите цену");
      return;
    }
    const price = Number(formPrice);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Укажите корректную цену");
      return;
    }
    const branchId = Number(formBranchId);
    const productId = Number(formProductId);
    const exists = branchProducts.some(
      (bp) => bp.branchId === branchId && bp.productId === productId,
    );
    if (exists) {
      toast.error("Этот товар уже привязан к выбранному филиалу");
      return;
    }
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
      setDialogOpen(false);
      loadData(true);
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 409) {
        toast.error(
          "Такая привязка уже есть. Возможно, удаление на сервере не сработало — обновите страницу (F5) и попробуйте снова.",
        );
        loadData(true);
      } else {
        toast.error("Ошибка привязки");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (bp: BranchProduct) => {
    setTogglingId(bp.id);
    try {
      if (bp.isActive) {
        await deleteBranchProduct(bp.id);
        toast.success("Товар деактивирован в филиале");
      } else {
        await restoreBranchProduct(bp.id);
        toast.success("Товар активирован в филиале");
      }
      await loadData(true);
    } catch {
      toast.error("Ошибка смены статуса");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteBranchProduct(deleteId);
      toast.success("Товар отвязан от филиала");
      setDeleteId(null);
      await loadData(true);
    } catch {
      toast.error("Ошибка отвязки. Проверьте, что запись исчезла из списка.");
      await loadData(true);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Товары в филиалах
          </h1>
          <p className="text-muted-foreground mt-1">
            Привязка товаров к филиалам и цены по филиалам
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Привязать товар к филиалу
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            Филиал:
          </Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Все филиалы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            Статус:
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v: "active" | "inactive" | "all") =>
              setStatusFilter(v)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Только активные</SelectItem>
              <SelectItem value="inactive">Только неактивные</SelectItem>
              <SelectItem value="all">Все</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Филиал</TableHead>
              <TableHead>Товар</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="text-right">Цена</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredByBranchAndStatus.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {filteredByBranch.length === 0
                    ? "Нет привязок. Нажмите «Привязать товар к филиалу»."
                    : "Нет привязок по выбранному фильтру."}
                </TableCell>
              </TableRow>
            ) : (
              filteredByBranchAndStatus.map((bp) => {
                const product = products.find((p) => p.id === bp.productId);
                return (
                  <TableRow key={bp.id}>
                    <TableCell className="font-medium">
                      {getBranchName(bp.branchId)}
                    </TableCell>
                    <TableCell>{getProductName(bp.productId)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product ? getCategoryName(product.categoryId) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {bp.price.toLocaleString("ru-RU")} ₽
                    </TableCell>
                    <TableCell className="text-right">{bp.stock}</TableCell>
                    <TableCell>
                      <Switch
                        checked={bp.isActive}
                        disabled={togglingId === bp.id}
                        onCheckedChange={() => handleToggleActive(bp)}
                        title={bp.isActive ? "Деактивировать" : "Активировать"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(bp)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(bp.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  <Label>Филиал</Label>
                  <Select value={formBranchId} onValueChange={setFormBranchId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" className="z-[100] w-[var(--radix-select-trigger-width)]">
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Товар</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Введите название или slug — список появится ниже"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setProductListOpen(true);
                        setProductSearchPage(1);
                        if (formProductId) setFormProductId("");
                      }}
                      onFocus={() => setProductListOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setProductListOpen(false), 150)
                      }
                      className="pl-9 pr-8"
                    />
                    {formProductId && (
                      <button
                        type="button"
                        onClick={clearProduct}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                            Нет подходящих товаров
                          </div>
                        ) : (
                          <>
                            <ul className="p-1">
                              {productSearchResults.map((p) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent focus:bg-accent focus:outline-none flex justify-between items-center"
                                    onClick={() => selectProduct(p)}
                                  >
                                    <span>{p.name}</span>
                                    <span className="text-muted-foreground tabular-nums">
                                      {Number(p.price ?? 0).toLocaleString("ru-RU")} ₽
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
                                      setProductSearchPage((p) => Math.max(1, p - 1))
                                    }
                                  >
                                    Назад
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
                  {formProductId && (
                    <p className="text-sm text-muted-foreground">
                      Категория:{" "}
                      <span className="text-foreground">
                        {getCategoryName(
                          products.find((p) => p.id === Number(formProductId))
                            ?.categoryId ?? 0,
                        ) || "—"}
                      </span>
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="flex items-end gap-2">
              <div className="space-y-2 flex-1">
                <Label>Цена в филиале</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0"
                />
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение…" : editingId ? "Сохранить" : "Привязать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Отвязать товар от филиала?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Товар перестанет отображаться в этом филиале. Цену и остаток можно
            будет задать заново при повторной привязке.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Удаление…" : "Отвязать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
