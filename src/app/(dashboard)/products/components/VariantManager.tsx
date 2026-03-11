"use client";

import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import {
  getVariantGroups,
  createVariantGroup,
  updateVariantGroup,
  createVariantOption,
  updateVariantOption,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { VariantGroup } from "../types";

interface EditableOption {
  _key: string;
  serverId?: number;
  name: string;
  priceDelta: number;
  sortOrder: number;
  isActive: boolean;
}

interface EditableGroup {
  _key: string;
  serverId?: number;
  name: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  options: EditableOption[];
}

let _keyCounter = 0;
const nextKey = () => `vk-${++_keyCounter}`;

function serverToLocal(groups: VariantGroup[]): EditableGroup[] {
  return groups.map((g) => ({
    _key: nextKey(),
    serverId: g.id,
    name: g.name,
    isRequired: g.isRequired,
    sortOrder: g.sortOrder,
    isActive: g.isActive,
    options: (g.options ?? []).map((o) => ({
      _key: nextKey(),
      serverId: o.id,
      name: o.name,
      priceDelta: o.priceDelta,
      sortOrder: o.sortOrder,
      isActive: o.isActive,
    })),
  }));
}

export interface VariantManagerHandle {
  save: () => Promise<void>;
}

interface VariantManagerProps {
  productId: number;
}

export const VariantManager = forwardRef<VariantManagerHandle, VariantManagerProps>(
  function VariantManager({ productId }, ref) {
    const [groups, setGroups] = useState<EditableGroup[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const serverSnapshot = useRef<VariantGroup[]>([]);

    const loadGroups = useCallback(async () => {
      setLoading(true);
      try {
        const data = await getVariantGroups(productId);
        const arr = (Array.isArray(data) ? data : []).map((g: VariantGroup) => ({
          ...g,
          options: g.options ?? [],
        }));
        serverSnapshot.current = arr;
        const local = serverToLocal(arr);
        setGroups(local);
        setExpandedGroups(new Set(local.map((g) => g._key)));
      } catch {
        toast.error("Ошибка загрузки вариантов");
      } finally {
        setLoading(false);
      }
    }, [productId]);

    useEffect(() => {
      loadGroups();
    }, [loadGroups]);

    // ---- Local editing (identical to creation mode) ----

    const addGroup = () => {
      const key = nextKey();
      setGroups((prev) => [
        ...prev,
        { _key: key, name: "", isRequired: false, sortOrder: prev.length, isActive: true, options: [] },
      ]);
      setExpandedGroups((prev) => new Set(prev).add(key));
    };

    const updateGroup = (key: string, patch: Partial<EditableGroup>) => {
      setGroups((prev) => prev.map((g) => (g._key === key ? { ...g, ...patch } : g)));
    };

    const removeGroup = (key: string) => {
      setGroups((prev) => prev.filter((g) => g._key !== key));
    };

    const addOption = (groupKey: string) => {
      setGroups((prev) =>
        prev.map((g) =>
          g._key === groupKey
            ? {
                ...g,
                options: [
                  ...g.options,
                  { _key: nextKey(), name: "", priceDelta: 0, sortOrder: g.options.length, isActive: true },
                ],
              }
            : g,
        ),
      );
    };

    const updateOption = (groupKey: string, optKey: string, patch: Partial<EditableOption>) => {
      setGroups((prev) =>
        prev.map((g) =>
          g._key === groupKey
            ? { ...g, options: g.options.map((o) => (o._key === optKey ? { ...o, ...patch } : o)) }
            : g,
        ),
      );
    };

    const removeOption = (groupKey: string, optKey: string) => {
      setGroups((prev) =>
        prev.map((g) =>
          g._key === groupKey
            ? { ...g, options: g.options.filter((o) => o._key !== optKey) }
            : g,
        ),
      );
    };

    const toggleGroup = (key: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    // ---- Save: reconcile local state with server (called by parent form) ----

    const saveVariants = useCallback(async () => {
      const currentGroups = groups;
      const oldMap = new Map(serverSnapshot.current.map((g) => [g.id, g]));

      for (let gi = 0; gi < currentGroups.length; gi++) {
        const lg = currentGroups[gi];
        let groupId: number;

        if (lg.serverId && oldMap.has(lg.serverId)) {
          groupId = lg.serverId;
          const og = oldMap.get(lg.serverId)!;
          const patch: Record<string, unknown> = {};
          if (lg.name.trim() !== og.name) patch.name = lg.name.trim();
          if (lg.isRequired !== og.isRequired) patch.isRequired = lg.isRequired;
          if (lg.isActive !== og.isActive) patch.isActive = lg.isActive;
          if (gi !== og.sortOrder) patch.sortOrder = gi;
          if (Object.keys(patch).length > 0) {
            await updateVariantGroup(productId, groupId, patch);
          }
        } else {
          const created = await createVariantGroup(productId, {
            name: lg.name.trim(),
            isRequired: lg.isRequired,
            sortOrder: gi,
            isActive: lg.isActive,
          });
          groupId = created.id;
        }

        const oldGroup = oldMap.get(groupId);
        const oldOptMap = new Map(
          (oldGroup?.options ?? []).map((o) => [o.id, o]),
        );

        for (let oi = 0; oi < lg.options.length; oi++) {
          const lo = lg.options[oi];
          if (lo.serverId && oldOptMap.has(lo.serverId)) {
            const oo = oldOptMap.get(lo.serverId)!;
            const patch: Record<string, unknown> = {};
            if (lo.name.trim() !== oo.name) patch.name = lo.name.trim();
            if (lo.priceDelta !== oo.priceDelta) patch.priceDelta = lo.priceDelta;
            if (lo.isActive !== oo.isActive) patch.isActive = lo.isActive;
            if (oi !== oo.sortOrder) patch.sortOrder = oi;
            if (Object.keys(patch).length > 0) {
              await updateVariantOption(productId, groupId, lo.serverId, patch);
            }
          } else {
            await createVariantOption(productId, groupId, {
              name: lo.name.trim(),
              priceDelta: lo.priceDelta,
              sortOrder: oi,
              isActive: lo.isActive,
            });
          }
        }
      }
    }, [groups, productId]);

    useImperativeHandle(ref, () => ({ save: saveVariants }), [saveVariants]);

    return (
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Загрузка...
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Нет групп вариантов
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group._key);
              return (
                <div
                  key={group._key}
                  className="rounded-lg border border-border/50 bg-card/80 overflow-hidden"
                >
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => toggleGroup(group._key)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <Input
                      value={group.name}
                      onChange={(e) => updateGroup(group._key, { name: e.target.value })}
                      placeholder="Название группы (Размер, Цвет...)"
                      className="bg-muted/50 h-8 text-sm flex-1"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                      <Switch
                        checked={group.isRequired}
                        onCheckedChange={(v) => updateGroup(group._key, { isRequired: v })}
                        size="sm"
                      />
                      Обяз.
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                      <Switch
                        checked={group.isActive}
                        onCheckedChange={(v) => updateGroup(group._key, { isActive: v })}
                        size="sm"
                      />
                      Акт.
                    </label>
                    {!group.serverId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeGroup(group._key)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Options */}
                  {isExpanded && (
                    <div className="border-t border-border/30 px-3 py-2 space-y-2">
                      {group.options.map((opt, oi) => (
                        <div key={opt._key} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                            {oi + 1}.
                          </span>
                          <Input
                            value={opt.name}
                            onChange={(e) =>
                              updateOption(group._key, opt._key, { name: e.target.value })
                            }
                            placeholder="Название (S, M, L...)"
                            className="bg-muted/50 h-7 text-xs flex-1"
                          />
                          <Input
                            type="number"
                            value={opt.priceDelta || ""}
                            onChange={(e) =>
                              updateOption(group._key, opt._key, {
                                priceDelta: Number(e.target.value) || 0,
                              })
                            }
                            placeholder="± ₽"
                            title="Надбавка или скидка к базовой цене товара"
                            className="bg-muted/50 h-7 text-xs w-24"
                          />
                          <Switch
                            checked={opt.isActive}
                            onCheckedChange={(v) =>
                              updateOption(group._key, opt._key, { isActive: v })
                            }
                            size="sm"
                            title={opt.isActive ? "Деактивировать" : "Активировать"}
                          />
                          {!opt.serverId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeOption(group._key, opt._key)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => addOption(group._key)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Опция
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={addGroup}
          >
            <Plus className="w-3 h-3 mr-1" />
            Добавить группу
          </Button>
        )}
      </div>
    );
  },
);
