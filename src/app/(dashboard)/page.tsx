"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories, getProducts, getBranches } from "@/lib/api";
import { FolderTree, Package, Building2, TrendingUp } from "lucide-react";

interface Stats {
  categories: number;
  products: number;
  branches: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [catData, prodData, branchData] = await Promise.all([
          getCategories({ page: 1, limit: 1 }),
          getProducts(),
          getBranches(),
        ]);
        setStats({
          categories: catData?.meta?.total ?? catData?.items?.length ?? 0,
          products: Array.isArray(prodData) ? prodData.length : 0,
          branches: Array.isArray(branchData) ? branchData.length : 0,
        });
      } catch {
        setStats({ categories: 0, products: 0, branches: 0 });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const cards = [
    {
      title: "Категории",
      value: stats?.categories ?? 0,
      icon: FolderTree,
      gradient: "from-indigo-500 to-blue-600",
      shadow: "shadow-indigo-500/20",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Товары",
      value: stats?.products ?? 0,
      icon: Package,
      gradient: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Филиалы",
      value: stats?.branches ?? 0,
      icon: Building2,
      gradient: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/20",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Дашборд</h2>
        <p className="text-muted-foreground mt-1">
          Обзор вашего магазина
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-full -translate-y-8 translate-x-8 blur-2xl`}
            />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg flex items-center justify-center`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{card.value}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href="/categories"
              className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <FolderTree className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-medium">Управление категориями</p>
                <p className="text-xs text-muted-foreground">Добавить, изменить</p>
              </div>
            </a>
            <a
              href="/products"
              className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <Package className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-medium">Управление товарами</p>
                <p className="text-xs text-muted-foreground">Добавить, изменить</p>
              </div>
            </a>
            <a
              href="/branches"
              className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <Building2 className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-medium">Управление филиалами</p>
                <p className="text-xs text-muted-foreground">Добавить, изменить</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
