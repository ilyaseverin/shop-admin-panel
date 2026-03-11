"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getVariantGroups,
  createVariantGroup,
  updateVariantGroup,
  deleteVariantGroup,
  createVariantOption,
  updateVariantOption,
  deleteVariantOption,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Loader2,
} from "lucide-react";
import type {
  VariantGroup,
  VariantGroupForm,
  VariantOptionForm,
} from "../types";

interface VariantManagerProps {
  productId: number;
}

const emptyGroupForm: VariantGroupForm = {
  name: "",
  isRequired: false,
  sortOrder: "0",
  isActive: true,
};

const emptyOptionForm: VariantOptionForm = {
  name: "",
  priceDelta: "0",
  sortOrder: "0",
  isActive: true,
};

export function VariantManager({ productId }: VariantManagerProps) {
  const [groups, setGroups] = useState<VariantGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Group form state
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState<VariantGroupForm>(emptyGroupForm);
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);

  // Option form state
  const [optionFormGroupId, setOptionFormGroupId] = useState<number | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [optionForm, setOptionForm] = useState<VariantOptionForm>(emptyOptionForm);
  const [savingOption, setSavingOption] = useState(false);
  const [deletingOptionId, setDeletingOptionId] = useState<number | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVariantGroups(productId);
      setGroups(
        (Array.isArray(data) ? data : []).map((g: VariantGroup) => ({
          ...g,
          options: g.options ?? [],
        }))
      );
    } catch {
      toast.error("Ошибка загрузки вариантов");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadGroups();
    setExpandedGroups(new Set());
    setGroupFormOpen(false);
    setEditingGroupId(null);
    setOptionFormGroupId(null);
    setEditingOptionId(null);
  }, [loadGroups]);

  const toggleGroup = (id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- Group CRUD ----
  const openCreateGroup = () => {
    setGroupForm(emptyGroupForm);
    setEditingGroupId(null);
    setGroupFormOpen(true);
  };

  const openEditGroup = (group: VariantGroup) => {
    setGroupForm({
      name: group.name,
      isRequired: group.isRequired,
      sortOrder: String(group.sortOrder ?? 0),
      isActive: group.isActive,
    });
    setEditingGroupId(group.id);
    setGroupFormOpen(true);
  };

  const cancelGroupForm = () => {
    setGroupFormOpen(false);
    setEditingGroupId(null);
    setGroupForm(emptyGroupForm);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error("Введите название группы");
      return;
    }
    setSavingGroup(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        isRequired: groupForm.isRequired,
        sortOrder: Number(groupForm.sortOrder) || 0,
        isActive: groupForm.isActive,
      };
      if (editingGroupId) {
        await updateVariantGroup(productId, editingGroupId, payload);
        toast.success("Группа обновлена");
      } else {
        await createVariantGroup(productId, payload);
        toast.success("Группа создана");
      }
      cancelGroupForm();
      await loadGroups();
    } catch {
      toast.error("Ошибка сохранения группы");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    setDeletingGroupId(groupId);
    try {
      await deleteVariantGroup(productId, groupId);
      toast.success("Группа удалена");
      await loadGroups();
    } catch {
      toast.error("Ошибка удаления группы");
    } finally {
      setDeletingGroupId(null);
    }
  };

  // ---- Option CRUD ----
  const openCreateOption = (groupId: number) => {
    setOptionForm(emptyOptionForm);
    setEditingOptionId(null);
    setOptionFormGroupId(groupId);
    setExpandedGroups((prev) => new Set(prev).add(groupId));
  };

  const openEditOption = (groupId: number, option: { id: number; name: string; priceDelta: number; sortOrder: number; isActive: boolean }) => {
    setOptionForm({
      name: option.name,
      priceDelta: String(option.priceDelta ?? 0),
      sortOrder: String(option.sortOrder ?? 0),
      isActive: option.isActive,
    });
    setEditingOptionId(option.id);
    setOptionFormGroupId(groupId);
  };

  const cancelOptionForm = () => {
    setOptionFormGroupId(null);
    setEditingOptionId(null);
    setOptionForm(emptyOptionForm);
  };

  const saveOption = async () => {
    if (!optionFormGroupId || !optionForm.name.trim()) {
      toast.error("Введите название опции");
      return;
    }
    setSavingOption(true);
    try {
      const payload = {
        name: optionForm.name.trim(),
        priceDelta: Number(optionForm.priceDelta) || 0,
        sortOrder: Number(optionForm.sortOrder) || 0,
        isActive: optionForm.isActive,
      };
      if (editingOptionId) {
        await updateVariantOption(productId, optionFormGroupId, editingOptionId, payload);
        toast.success("Опция обновлена");
      } else {
        await createVariantOption(productId, optionFormGroupId, payload);
        toast.success("Опция создана");
      }
      cancelOptionForm();
      await loadGroups();
    } catch {
      toast.error("Ошибка сохранения опции");
    } finally {
      setSavingOption(false);
    }
  };

  const handleDeleteOption = async (groupId: number, optionId: number) => {
    setDeletingOptionId(optionId);
    try {
      await deleteVariantOption(productId, groupId, optionId);
      toast.success("Опция удалена");
      await loadGroups();
    } catch {
      toast.error("Ошибка удаления опции");
    } finally {
      setDeletingOptionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add group button / form */}
      {groupFormOpen ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <p className="text-sm font-medium">
            {editingGroupId ? "Редактировать группу" : "Новая группа"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Название *</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Размер, Цвет..."
                className="bg-muted/50 h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Порядок</Label>
              <Input
                type="number"
                value={groupForm.sortOrder}
                onChange={(e) => setGroupForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="bg-muted/50 h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={groupForm.isRequired}
                onCheckedChange={(v) => setGroupForm((f) => ({ ...f, isRequired: v }))}
                size="sm"
              />
              Обязательная
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={groupForm.isActive}
                onCheckedChange={(v) => setGroupForm((f) => ({ ...f, isActive: v }))}
                size="sm"
              />
              Активна
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={saveGroup}
              disabled={savingGroup}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
            >
              {savingGroup ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1" />
              )}
              {editingGroupId ? "Обновить" : "Создать"}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelGroupForm}>
              <X className="w-3.5 h-3.5 mr-1" />
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={openCreateGroup}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Добавить группу
        </Button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Загрузка...
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Нет групп вариантов. Создайте первую группу.
        </div>
      )}

      {/* Groups list */}
      {!loading &&
        groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const isEditingOptions = optionFormGroupId === group.id;
          return (
            <div
              key={group.id}
              className="rounded-lg border border-border/50 bg-card/80 overflow-hidden"
            >
              {/* Group header */}
              <div
                className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-medium text-sm">{group.name}</span>
                <div className="flex items-center gap-2 ml-auto">
                  {group.isRequired && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      обязательная
                    </Badge>
                  )}
                  <Badge
                    variant={group.isActive ? "default" : "outline"}
                    className={`text-[10px] px-1.5 py-0 ${
                      group.isActive
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "text-muted-foreground"
                    }`}
                  >
                    {group.isActive ? "активна" : "неактивна"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    #{group.sortOrder}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({group.options?.length ?? 0} опц.)
                  </span>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditGroup(group)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={deletingGroupId === group.id}
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      {deletingGroupId === group.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Options list (expanded) */}
              {isExpanded && (
                <div className="border-t border-border/30 px-4 py-3 space-y-3">
                  {(group.options?.length ?? 0) > 0 && (
                    <div className="rounded-md border border-border/30 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs h-8">Название</TableHead>
                            <TableHead className="text-xs h-8 w-28">Дельта цены</TableHead>
                            <TableHead className="text-xs h-8 w-20">Порядок</TableHead>
                            <TableHead className="text-xs h-8 w-24">Статус</TableHead>
                            <TableHead className="text-xs h-8 w-20 text-right">
                              Действия
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.options.map((option) => (
                            <TableRow key={option.id}>
                              <TableCell className="text-sm py-2">
                                {option.name}
                              </TableCell>
                              <TableCell className="text-sm py-2 font-mono">
                                {option.priceDelta > 0 ? "+" : ""}
                                {option.priceDelta} ₽
                              </TableCell>
                              <TableCell className="text-sm py-2 text-muted-foreground">
                                {option.sortOrder}
                              </TableCell>
                              <TableCell className="py-2">
                                <Badge
                                  variant={option.isActive ? "default" : "outline"}
                                  className={`text-[10px] px-1.5 py-0 ${
                                    option.isActive
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {option.isActive ? "активна" : "неактивна"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-2">
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() =>
                                      openEditOption(group.id, option)
                                    }
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    disabled={deletingOptionId === option.id}
                                    onClick={() =>
                                      handleDeleteOption(group.id, option.id)
                                    }
                                  >
                                    {deletingOptionId === option.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Option form (inline) */}
                  {isEditingOptions ? (
                    <div className="rounded-md border border-teal-500/30 bg-teal-500/5 p-3 space-y-3">
                      <p className="text-xs font-medium">
                        {editingOptionId ? "Редактировать опцию" : "Новая опция"}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Название *</Label>
                          <Input
                            value={optionForm.name}
                            onChange={(e) =>
                              setOptionForm((f) => ({ ...f, name: e.target.value }))
                            }
                            placeholder="S, M, L..."
                            className="bg-muted/50 h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Дельта цены (₽)</Label>
                          <Input
                            type="number"
                            value={optionForm.priceDelta}
                            onChange={(e) =>
                              setOptionForm((f) => ({
                                ...f,
                                priceDelta: e.target.value,
                              }))
                            }
                            className="bg-muted/50 h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Порядок</Label>
                          <Input
                            type="number"
                            value={optionForm.sortOrder}
                            onChange={(e) =>
                              setOptionForm((f) => ({
                                ...f,
                                sortOrder: e.target.value,
                              }))
                            }
                            className="bg-muted/50 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={optionForm.isActive}
                          onCheckedChange={(v) =>
                            setOptionForm((f) => ({ ...f, isActive: v }))
                          }
                          size="sm"
                        />
                        Активна
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveOption}
                          disabled={savingOption}
                          className="h-7 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
                        >
                          {savingOption ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          {editingOptionId ? "Обновить" : "Создать"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={cancelOptionForm}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => openCreateOption(group.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Добавить опцию
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
