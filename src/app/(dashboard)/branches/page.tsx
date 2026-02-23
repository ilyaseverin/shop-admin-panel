"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getBranches,
  deleteBranch,
  restoreBranch,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Branch } from "./types";
import { BranchFormDialog } from "./components/BranchFormDialog";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  /** Фильтр по статусу: по умолчанию только активные (неактивные не отображаются). */
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");

  const filteredBranches = useMemo(() => {
    if (statusFilter === "active")
      return branches.filter((b) => b.isActive !== false);
    if (statusFilter === "inactive")
      return branches.filter((b) => b.isActive === false);
    return branches;
  }, [branches, statusFilter]);

  const loadBranches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Ошибка загрузки филиалов");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const openCreate = () => {
    setEditingBranch(null);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setDialogOpen(true);
  };

  const handleSaved = useCallback(() => {
    loadBranches(true);
  }, [loadBranches]);

  const handleToggleActive = async (branch: Branch) => {
    setTogglingId(branch.id);
    try {
      if (branch.isActive ?? true) {
        await deleteBranch(branch.id);
        toast.success("Филиал деактивирован");
      } else {
        await restoreBranch(branch.id);
        toast.success("Филиал активирован");
      }
      loadBranches(true);
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
      await deleteBranch(deleteId);
      toast.success("Филиал удалён");
      setDeleteId(null);
      loadBranches(true);
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
          <h2 className="text-2xl font-bold tracking-tight">Филиалы</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Управление филиалами магазина
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Статус:</span>
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

      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead className="w-20">Статус</TableHead>
              <TableHead className="w-24 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredBranches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  {branches.length === 0
                    ? "Филиалы не найдены"
                    : "Нет филиалов по выбранному фильтру"}
                </TableCell>
              </TableRow>
            ) : (
              filteredBranches.map((branch) => (
                <TableRow key={branch.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {branch.id}
                  </TableCell>
                  <TableCell
                    className="font-medium max-w-[150px] truncate"
                    title={branch.name}
                  >
                    {branch.name}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground text-sm max-w-[200px] truncate"
                    title={branch.address}
                  >
                    {branch.address}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.city || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {branch.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={branch.isActive ?? true}
                      disabled={togglingId === branch.id}
                      onCheckedChange={() => handleToggleActive(branch)}
                      title={branch.isActive ? "Деактивировать" : "Активировать"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(branch)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(branch.id)}
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

      <BranchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branch={editingBranch}
        onSaved={handleSaved}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Удалить филиал?"
        description="Филиал будет удалён навсегда. Это действие нельзя отменить."
      />
    </div>
  );
}
