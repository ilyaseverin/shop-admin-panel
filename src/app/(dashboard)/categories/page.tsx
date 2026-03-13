"use client";

import { useState } from "react";
import { deleteCategory, restoreCategory, getCategories } from "@/lib/api";
import { useCategories, invalidateCategories } from "@/lib/swr";
import { useDebounce } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
} from "lucide-react";
import type { Category } from "./types";
import { CategoryFormDialog } from "./components/CategoryFormDialog";

export default function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<"active" | "deleted" | "all">("active");
  const isDeleted = statusFilter === "all" ? undefined : statusFilter === "deleted";
  const limit = 10;

  const { data: listData, isLoading } = useCategories({
    page,
    limit,
    name: debouncedSearch.trim() || undefined,
    isDeleted,
  });

  const categories = ((listData as { items?: Category[] })?.items ?? []) as Category[];
  const total = (listData as { meta?: { total?: number } })?.meta?.total ?? 0;

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
    getCategories({ page: 1, limit: 25 })
      .then((data) => setAllCategories((data as { items?: Category[] }).items ?? []))
      .catch(() => setAllCategories([]));
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setDialogOpen(true);
    getCategories({ page: 1, limit: 25 })
      .then((data) => setAllCategories((data as { items?: Category[] }).items ?? []))
      .catch(() => setAllCategories([]));
  };

  const handleSaved = () => {
    invalidateCategories();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteId);
      toast.success("Категория удалена");
      setDeleteId(null);
      invalidateCategories();
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Категории</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Управление категориями товаров
          </p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25">
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-muted/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Статус:</span>
          <Select
            value={statusFilter}
            onValueChange={(v: "active" | "deleted" | "all") => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="deleted">Удалённые</SelectItem>
              <SelectItem value="all">Все</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="w-24">ParentID</TableHead>
              <TableHead className="w-24 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  Категории не найдены
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {cat.id}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={cat.name}>
                    {cat.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs max-w-[150px] truncate block" title={cat.slug}>
                      {cat.slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {cat.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cat.parentId || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {cat.deletedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await restoreCategory(cat.id);
                              toast.success("Категория восстановлена");
                              invalidateCategories();
                            } catch {
                              toast.error("Ошибка восстановления");
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                          title="Восстановить"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(cat.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Всего: {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        allCategories={allCategories}
        onSaved={handleSaved}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Удалить категорию?"
        description="Категория будет удалена навсегда. Это действие нельзя отменить."
      />
    </div>
  );
}
