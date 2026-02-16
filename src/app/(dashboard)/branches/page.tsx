"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DeleteDialog } from "@/components/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  description?: string;
  address: string;
  city?: string;
  region?: string;
  phone?: string;
  isActive?: boolean;
}

interface BranchForm {
  name: string;
  address: string;
  description: string;
  city: string;
  region: string;
  phone: string;
  isActive: boolean;
}

const emptyForm: BranchForm = {
  name: "",
  address: "",
  description: "",
  city: "",
  region: "",
  phone: "",
  isActive: true,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name || "",
      address: branch.address || "",
      description: branch.description || "",
      city: branch.city || "",
      region: branch.region || "",
      phone: branch.phone || "",
      isActive: branch.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address) {
      toast.error("Заполните обязательные поля (Название и Адрес)");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        description: form.description || undefined,
        city: form.city || undefined,
        region: form.region || undefined,
        phone: form.phone || undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateBranch(editingId, payload);
        toast.success("Филиал обновлён");
      } else {
        await createBranch(payload);
        toast.success("Филиал создан");
      }
      setDialogOpen(false);
      loadBranches(true);
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
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
        <Button onClick={openCreate} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/25">
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
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
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  Филиалы не найдены
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch) => (
                <TableRow key={branch.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {branch.id}
                  </TableCell>
                  <TableCell className="font-medium max-w-[150px] truncate" title={branch.name}>
                    {branch.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={branch.address}>
                    {branch.address}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.city || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {branch.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={branch.isActive ? "default" : "secondary"}
                      className={
                        branch.isActive
                          ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-0"
                          : "bg-muted text-muted-foreground border-0"
                      }
                    >
                      {branch.isActive ? "Активен" : "Неактивен"}
                    </Badge>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать филиал" : "Новый филиал"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Центральный офис"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Адрес *</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="ул. Примерная, д. 1"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Описание филиала..."
                className="bg-muted/50 resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Город</Label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="Москва"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Регион</Label>
                <Input
                  value={form.region}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, region: e.target.value }))
                  }
                  placeholder="Московская область"
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+7 (999) 123-45-67"
                className="bg-muted/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
              <Label>Филиал активен</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
              >
                {saving ? "Сохранение..." : editingId ? "Обновить" : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
