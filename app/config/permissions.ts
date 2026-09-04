// app/config/permissions.ts

import type { AppModule } from "@/app/types/parking";

export const modulePermissions: Partial<Record<AppModule, string>> = {
  dashboard: "dashboard.view",
  entries: "stays.view",
  vehicles: "stays.view",
  shifts: "shifts.view",
  cashCuts: "cash_cuts.view",
  reports: "reports.view",
  staff: "staff.view",
  settings: "settings.view",
};

export const rolePermissionDefaults: Record<string, string[]> = {
  admin: [
    "dashboard.view",
    "stays.view",
    "stays.create",
    "stays.checkout",
    "payments.view",
    "payments.create",
    "shifts.view",
    "shifts.manage",
    "cash_cuts.view",
    "reports.view",
    "reports.export",
    "staff.view",
    "staff.manage",
    "settings.view",
    "rates.manage",
    "lots.manage",
    "devices.manage",
  ],

  cashier: [
    "dashboard.view",
    "stays.view",
    "stays.create",
    "stays.checkout",
    "payments.view",
    "payments.create",
    "shifts.view",
    "shifts.manage",
    "cash_cuts.view",
    "reports.view",
  ],

  operator: [
    "stays.view",
    "stays.create",
    "stays.checkout",
    "shifts.view",
  ],

  viewer: [
    "dashboard.view",
    "stays.view",
    "shifts.view",
    "cash_cuts.view",
    "reports.view",
  ],
};

export const accessModules = [
  {
    id: "dashboard",
    label: "Resumen",
    description: "Indicadores generales",
    view: "dashboard.view",
    manage: [],
  },
  {
    id: "entries",
    label: "Entradas y salidas",
    description: "Vehículos, boletos y operación",
    view: "stays.view",
    manage: ["stays.create", "stays.checkout", "payments.create"],
  },
  {
    id: "shifts",
    label: "Cajas",
    description: "Puntos de cobro y turnos",
    view: "shifts.view",
    manage: ["shifts.manage"],
  },
  {
    id: "cashCuts",
    label: "Cortes de caja",
    description: "Historial de cierres",
    view: "cash_cuts.view",
    manage: [],
  },
  {
    id: "reports",
    label: "Reportes",
    description: "Indicadores e ingresos",
    view: "reports.view",
    manage: ["reports.export"],
  },
  {
    id: "staff",
    label: "Personal",
    description: "Usuarios y permisos",
    view: "staff.view",
    manage: ["staff.manage"],
  },
  {
    id: "settings",
    label: "Configuración",
    description: "Tarifas y dispositivos",
    view: "settings.view",
    manage: ["rates.manage", "lots.manage", "devices.manage"],
  },
] as const;