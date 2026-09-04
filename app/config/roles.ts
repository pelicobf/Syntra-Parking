// app/config/roles.ts

export const roleOptions = [
  {
    id: "admin",
    label: "Administrador",
    description: "Control operativo, personal y configuración.",
  },
  {
    id: "cashier",
    label: "Cajero",
    description: "Entradas, salidas, cobros y cajas.",
  },
  {
    id: "operator",
    label: "Operador",
    description: "Accesos y consulta de cajas.",
  },
  {
    id: "viewer",
    label: "Consulta",
    description: "Información sin acciones operativas.",
  },
];

export const roleLabels: Record<string, string> = {
  super_admin: "Superadministrador",
  owner: "Propietario",
  admin: "Administrador",
  cashier: "Cajero",
  operator: "Operador",
  viewer: "Consulta",
};

export function getRoleLabel(role: string) {
  return roleLabels[role] ?? role;
}