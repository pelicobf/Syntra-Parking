// app/config/navigation.ts

import {
  ArrowRightLeft,
  WalletCards,
  CalendarRange,
  BarChart3,
  Users,
  Settings2,
  type LucideIcon,
} from "lucide-react";

import type { AppModule } from "@/app/types/parking";

export type NavigationItem = {
  id: AppModule;
  label: string;
  icon: LucideIcon;
  group?: string;
};

export const nav: NavigationItem[] = [
  {
    id: "entries",
    label: "Entradas y salidas",
    icon: ArrowRightLeft,
  },
  {
    id: "shifts",
    label: "Cajas",
    icon: WalletCards,
    group: "GESTIÓN",
  },
  {
    id: "cashCuts",
    label: "Cortes de caja",
    icon: CalendarRange,
  },
  {
    id: "reports",
    label: "Reportes",
    icon: BarChart3,
  },
  {
    id: "staff",
    label: "Personal",
    icon: Users,
  },
  {
    id: "settings",
    label: "Configuración",
    icon: Settings2,
    group: "ADMINISTRACIÓN",
  },
];