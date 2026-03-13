"use client";

import { useState } from "react";
import { deleteCollection, restoreCollection } from "@/lib/api";
import { useCollections, invalidateCollections } from "@/lib/swr";
import { useDebounce } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import type { Collection } from "./types";
import { CollectionFormDialog } from "./components/CollectionFormDialog";

const PAGE_SIZE = 25;

export default function CollectionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "active" | "deleted" | "all"
  >("active");
  const debouncedSearch = useDebounce(search, 300);

  const isDeleted =
    statusFilter === "all" ? undefined : statusFilter === "deleted";

  const { data, isLoading } = useCollections({
    page,
    limit: PAGE_SIZE,
    title: debouncedSearch.trim() || undefined,
    isDeleted,
  });

  const collections = (data?.items ?? []) as Collection[];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingCollection(null);
    setDialogOpen(true);
  };

  const openEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    invalidateCollections();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCollection(deleteId);
      toast.success("Коллекция удалена");
      setDeleteId(null);
      invalidateCollections();
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Коллекции</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Управление коллекциями товаров
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 shadow-lg shadow-violet-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
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
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="w-24">Товаров</TableHead>
              <TableHead className="w-24 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : collections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-12"
                >
                  Коллекции не найдены
                </TableCell>
              </TableRow>
            ) : (
              collections.map((col) => (
                <TableRow key={col.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {col.id}
                  </TableCell>
                  <TableCell
                    className="font-medium max-w-[200px] truncate"
                    title={col.title}
                  >
                    {col.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[250px] truncate">
                    {col.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {col.products?.length ?? col.productIds?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {col.deletedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await restoreCollection(col.id);
                              toast.success("Коллекция восстановлена");
                              invalidateCollections();
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
                        onClick={() => openEdit(col)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(col.id)}
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Всего: {total}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CollectionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collection={editingCollection}
        onSaved={handleSaved}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Удалить коллекцию?"
        description="Коллекция будет удалена. Это действие можно отменить."
      />
    </div>
  );
}
