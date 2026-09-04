"use client";

import {
  Building2,
  ChevronLeft,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { Brand } from "./Brand";

import { nav } from "@/app/config/navigation";
import { getRoleLabel } from "@/app/config/roles";
import { useParkingStore } from "@/app/hooks/use-parking-store";
import { useParkingPermissions } from "@/app/hooks/useParkingPermissions";

import type { AppModule } from "@/app/types/parking";

type SidebarProps = {
  module: AppModule;
  collapsed: boolean;

  onModuleChange: (module: AppModule) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  module,
  collapsed,
  onModuleChange,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const store = useParkingStore();

  const {
    canViewModule,
  } = useParkingPermissions();

  const initials = store.profile.fullName
    .split(" ")
    .map((value) => value[0])
    .join("")
    .slice(0, 2);

  function selectModule(nextModule: AppModule) {
    onModuleChange(nextModule);
    onCloseMobile();
  }

  return (
    <aside className="sidebar">

      <button
        className="sidebar-toggle"
        aria-label={
          collapsed
            ? "Expandir menú"
            : "Contraer menú"
        }
        onClick={onToggleCollapsed}
      >
        <ChevronLeft size={14} />
      </button>

      <Brand />

      <nav>
        {nav
          .filter((item) => canViewModule(item.id))
          .map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id}>

                {item.group && (
                  <p>{item.group}</p>
                )}

                <button
                  className={
                    module === item.id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    selectModule(item.id)
                  }
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                >
                  <span>
                    <Icon size={18} />
                  </span>

                  <b>{item.label}</b>
                </button>

              </div>
            );
          })}
      </nav>

      <div className="side-profile side-session">

        <span>{initials}</span>

        <div className="session-identity">
          <b>{store.profile.fullName}</b>

          <em>
            {store.profile.email ||
              "Usuario autenticado"}
          </em>
        </div>

        <strong>
          <ShieldCheck size={12} />

          {getRoleLabel(
            store.profile.role
          )}
        </strong>

        <section>
          <Building2 size={14} />

          <span>
            <small>EMPRESA ACTIVA</small>
            <b>{store.businessName}</b>
          </span>
        </section>

        <footer
          className={
            store.shift.status === "open"
              ? "shift-open"
              : "shift-closed"
          }
        >
          <i />

          {store.shift.status === "open"
            ? "Caja abierta"
            : "Caja cerrada"}

          <button
            aria-label="Cerrar sesión"
            onClick={() =>
              void store.signOut()
            }
          >
            <LogOut size={15} />
            <b>Salir</b>
          </button>

        </footer>
      </div>
    </aside>
  );
}