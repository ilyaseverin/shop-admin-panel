"use client";

import { useState } from "react";
import {
  deleteBranchProduct,
  restoreBranchProduct,
} from "@/lib/api";
import {
  useBranchProducts,
  useProducts,
  useBranches,
  useCategories,
  invalidateBranchProducts,
} from "@/lib/swr";
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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { BranchProduct, Product, Branch, Category } from "./types";
import { BranchProductFormDialog } from "./components/BranchProductFormDialog";

export default function BranchProductsPage() {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");
  const [bpPage, setBpPage] = useState(1);

  const branchId =
    branchFilter === "all" ? undefined : Number(branchFilter);
  const isActive =
    statusFilter === "all" ? undefined : statusFilter === "active";

  const { data: bpRes, isLoading } = useBranchProducts({
    branchId,
    isActive,
    page: bpPage,
    limit: 25,
  });
  const { data: prodRes } = useProducts({ page: 1, limit: 25 });
  const { data: branchRes } = useBranches({ isActive: true, limit: 25 });
  const { data: catRes } = useCategories({ page: 1, limit: 25 });

  const branchProducts = (bpRes?.items ?? []) as BranchProduct[];
  const bpTotal = bpRes?.meta?.total ?? branchProducts.length;
  const products = (prodRes?.items ?? []) as Product[];
  const branches = (branchRes?.items ?? []) as Branch[];
  const categories = ((catRes as { items?: Category[] })?.items ?? []) as Category[];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BranchProduct | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleSaved = () => {
    invalidateBranchProducts();
  };

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
      invalidateBranchProducts();
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
      invalidateBranchProducts();
    } catch {
      toast.error("Ошибка отвязки. Проверьте, что запись исчезла из списка.");
      invalidateBranchProducts();
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
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
          <Select
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v);
              setBpPage(1);
            }}
          >
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
            onValueChange={(v: "active" | "inactive" | "all") => {
              setStatusFilter(v);
              setBpPage(1);
            }}
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
            {branchProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  Нет привязок по выбранному фильтру. Нажмите «Привязать товар к
                  филиалу» или измените фильтры.
                </TableCell>
              </TableRow>
            ) : (
              branchProducts.map((bp) => {
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

      {bpTotal > 25 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Всего: {bpTotal}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={bpPage <= 1}
              onClick={() => setBpPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {bpPage} / {Math.ceil(bpTotal / 25) || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={bpPage >= Math.ceil(bpTotal / 25)}
              onClick={() => setBpPage((p) => p + 1)}
            >
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BranchProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        branches={branches}
        products={products}
        categories={categories}
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
