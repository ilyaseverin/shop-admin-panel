"use client";

import { useEffect, useState, useRef } from "react";
import { createBranch, updateBranch, getBranch, uploadImage, deleteImage, getImageUrl } from "@/lib/api";
import { invalidateBranches } from "@/lib/swr";
import { Upload, X } from "lucide-react";
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

type FieldErrors = Partial<Record<keyof BranchForm, string>>;

function validate(form: BranchForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Введите название филиала";
  if (!form.address.trim()) errors.address = "Введите адрес филиала";
  return errors;
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitted(false);
    // Revoke old blob URL
    if (bannerPreviewUrl) {
      URL.revokeObjectURL(bannerPreviewUrl);
      setBannerPreviewUrl(null);
    }
    setPendingBannerFile(null);
    if (branch) {
      setForm({
        name: branch.name || "",
        address: branch.address || "",
        description: branch.description || "",
        city: branch.city || "",
        region: branch.region || "",
        phone: branch.phone || "",
        email: branch.email || "",
        workingHours: branch.workingHours || "",
        latitude: branch.latitude != null ? String(branch.latitude) : "",
        longitude: branch.longitude != null ? String(branch.longitude) : "",
        isActive: branch.isActive ?? true,
      });
      setBannerImage(branch.bannerImage || null);
      // Fetch full branch details to get bannerImage if not in list data
      if (!branch.bannerImage && branch.id) {
        getBranch(branch.id)
          .then((full) => {
            if (full?.bannerImage) {
              setBannerImage(full.bannerImage);
            }
          })
          .catch(() => {});
      }
    } else {
      setForm(emptyBranchForm);
      setBannerImage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branch]);

  const updateField = <K extends keyof BranchForm>(key: K, value: BranchForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async () => {
    setSubmitted(true);
    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        description: form.description || undefined,
        city: form.city || undefined,
        region: form.region || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        workingHours: form.workingHours || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateBranch(editingId, payload);
        // Upload banner if pending, then save externalId to branch
        if (pendingBannerFile) {
          setUploadingBanner(true);
          try {
            const imgResult = await uploadImage(pendingBannerFile, {
              entityType: "branch",
              entityId: String(editingId),
              imageType: "banner",
            });
            const externalId = imgResult?.externalId ?? imgResult?.id;
            if (externalId) {
              await updateBranch(editingId, { bannerImage: String(externalId) });
            }
          } finally {
            setUploadingBanner(false);
          }
        }
        toast.success("Филиал обновлён");
      } else {
        const created = await createBranch(payload);
        const newId = created?.id;
        if (newId && pendingBannerFile) {
          setUploadingBanner(true);
          try {
            const imgResult = await uploadImage(pendingBannerFile, {
              entityType: "branch",
              entityId: String(newId),
              imageType: "banner",
            });
            const externalId = imgResult?.externalId ?? imgResult?.id;
            if (externalId) {
              await updateBranch(newId, { bannerImage: String(externalId) });
            }
          } finally {
            setUploadingBanner(false);
          }
        }
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
            <Label>
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Центральный офис"
              className={`bg-muted/50 ${errors.name ? "border-destructive" : ""}`}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>
              Адрес <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="ул. Примерная, д. 1"
              className={`bg-muted/50 ${errors.address ? "border-destructive" : ""}`}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
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
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Москва"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Регион</Label>
              <Input
                value={form.region}
                onChange={(e) => updateField("region", e.target.value)}
                placeholder="Московская область"
                className="bg-muted/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Телефон</Label>
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="branch@example.com"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Часы работы</Label>
            <Input
              value={form.workingHours}
              onChange={(e) => updateField("workingHours", e.target.value)}
              placeholder="Пн-Пт 9:00-18:00"
              className="bg-muted/50"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Широта</Label>
              <Input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => updateField("latitude", e.target.value)}
                placeholder="55.7558"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Долгота</Label>
              <Input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => updateField("longitude", e.target.value)}
                placeholder="37.6173"
                className="bg-muted/50"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Баннер</Label>
            <div className="border border-dashed border-border/70 rounded-xl p-4 space-y-3">
              {(bannerImage || bannerPreviewUrl) && (
                <div className="relative w-full max-w-xs h-32 rounded-lg bg-muted overflow-hidden group/img border border-border">
                  <img
                    src={
                      bannerPreviewUrl
                        ? bannerPreviewUrl
                        : getImageUrl(bannerImage!)
                    }
                    alt="Баннер"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (bannerImage && !pendingBannerFile) {
                        try {
                          await deleteImage(bannerImage);
                          // Clear bannerImage field on the backend
                          if (editingId) {
                            await updateBranch(editingId, { bannerImage: "" });
                          }
                          invalidateBranches();
                        } catch {
                          toast.error("Ошибка удаления баннера");
                          return;
                        }
                      }
                      if (bannerPreviewUrl) {
                        URL.revokeObjectURL(bannerPreviewUrl);
                        setBannerPreviewUrl(null);
                      }
                      setBannerImage(null);
                      setPendingBannerFile(null);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-white cursor-pointer opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {!bannerImage && !bannerPreviewUrl && (
                <div
                  className="flex flex-col items-center gap-2 py-4 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {uploadingBanner ? (
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Загрузить баннер</p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Revoke old blob URL if exists
                    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
                    const url = URL.createObjectURL(file);
                    setPendingBannerFile(file);
                    setBannerPreviewUrl(url);
                    setBannerImage(null);
                  }
                  if (bannerInputRef.current) bannerInputRef.current.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => updateField("isActive", checked)}
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
