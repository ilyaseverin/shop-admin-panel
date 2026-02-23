"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getProductsAll,
  getCategories,
  deleteProduct,
  getImageUrl,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { Product, Category } from "./types";
import { ProductFormDialog } from "./components/ProductFormDialog";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        getProductsAll(),
        getCategories({ page: 1, limit: 100 }),
      ]);
      setProducts((Array.isArray(prodData) ? prodData : []) as Product[]);
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
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleSaved = useCallback(
    (updatedProduct?: Product) => {
      if (updatedProduct) {
        setProducts((prev) =>
          prev.some((p) => p.id === updatedProduct.id)
            ? prev.map((p) =>
                p.id === updatedProduct.id
                  ? { ...p, ...updatedProduct, images: updatedProduct.images }
                  : p
              )
            : [...prev, updatedProduct]
        );
      } else {
        loadData(true);
      }
    },
    [loadData]
  );

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

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        categories={categories}
        onSaved={handleSaved}
      />

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
