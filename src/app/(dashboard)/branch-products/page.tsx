"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getAllBranchProducts,
  getProductsAll,
  getBranches,
  getCategories,
  deleteBranchProduct,
  restoreBranchProduct,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { BranchProduct, Product, Branch, Category } from "./types";
import { BranchProductFormDialog } from "./components/BranchProductFormDialog";

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
  const [editingItem, setEditingItem] = useState<BranchProduct | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
      setProducts((Array.isArray(prodRes) ? prodRes : []) as Product[]);
      setBranches((Array.isArray(branchRes) ? branchRes : []) as Branch[]);
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

  const handleSaved = useCallback(() => {
    loadData(true);
  }, [loadData]);

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

  const getBranchName = (id: number) =>
    branches.find((b) => b.id === id)?.name ?? `#${id}`;
  const getProductName = (id: number) =>
    products.find((p) => p.id === id)?.name ?? `#${id}`;
  const getCategoryName = (id: number) =>
    categories.find((c) => c.id === id)?.name ?? "";

  const openCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const openEdit = (bp: BranchProduct) => {
    setEditingItem(bp);
    setDialogOpen(true);
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

      <BranchProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        branches={branches}
        products={products}
        categories={categories}
        branchProducts={branchProducts}
        onSaved={handleSaved}
      />

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
