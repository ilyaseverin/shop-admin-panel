"use client";

import { useEffect, useState } from "react";
import { createBranch, updateBranch } from "@/lib/api";
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
import { toast } from "sonner";
import type { Branch, BranchForm } from "../types";
import { emptyBranchForm } from "../types";

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onSaved: () => void;
}

export function BranchFormDialog({
  open,
  onOpenChange,
  branch,
  onSaved,
}: BranchFormDialogProps) {
  const editingId = branch?.id ?? null;
  const [form, setForm] = useState<BranchForm>(emptyBranchForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (branch) {
      setForm({
        name: branch.name || "",
        address: branch.address || "",
        description: branch.description || "",
        city: branch.city || "",
        region: branch.region || "",
        phone: branch.phone || "",
        isActive: branch.isActive ?? true,
      });
    } else {
      setForm(emptyBranchForm);
    }
  }, [open, branch]);

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
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
