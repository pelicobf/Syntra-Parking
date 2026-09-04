"use client";

import {
  Bell,
  Building2,
  ChevronRight,
  LayoutDashboard,
  ParkingCircle,
} from "lucide-react";

import { Brand } from "./Brand";

import { useParkingStore } from "@/app/hooks/use-parking-store";
import { useParkingPermissions } from "@/app/hooks/useParkingPermissions";

import type { AppModule } from "@/app/types/parking";

type TopbarProps = {
  module: AppModule;

  title: string;
  subtitle: string;

  navigationMode: "sidebar" | "mosaic";

  pendingCount: number;

  onHome: () => void;
  onOpenMobile: () => void;
  onOpenLogin: () => void;
};

export function Topbar({
  title,
  subtitle,
  navigationMode,
  pendingCount,
  onHome,
  onOpenMobile,
  onOpenLogin,
}: TopbarProps) {
  const store = useParkingStore();

  const {
    isSuperAdmin,
    canAccessLot,
  } = useParkingPermissions();

  return (
    <header className="topbar">

      <div className="top-title">

        {navigationMode === "mosaic" ? (
          <button
            className="mosaic-home-button"
            onClick={onHome}
            aria-label="Volver al inicio"
            title="Volver al menú de módulos"
          >
            <LayoutDashboard />
            <span>Inicio</span>
          </button>
        ) : (
          <button
            className="mobile-brand"
            onClick={onOpenMobile}
          >
            <Brand />
          </button>
        )}

        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

      </div>

      <div className="top-controls syntra-context">

        {isSuperAdmin && (
          <button
            className="platform-return"
            onClick={() =>
              void store.leavePlatformBusiness()
            }
          >
            <span>
              <LayoutDashboard size={17} />
            </span>

            <div>
              <small>
                SUPER ADMINISTRACIÓN
              </small>

              <b>
                Volver al panel global
              </b>
            </div>

            <ChevronRight size={15} />
          </button>
        )}

        <div className="business-context">
          <span>
            <Building2 size={16} />
          </span>

          <div>
            <small>EMPRESA</small>
            <b>{store.businessName}</b>
          </div>
        </div>

        <label className="branch-context">

          <span>
            <ParkingCircle size={16} />
          </span>

          <div>
            <small>
              SUCURSAL ACTIVA
            </small>

            <select
              value={store.lotId}
              disabled={!store.lots.length}
              onChange={(e) =>
                store.setLotId(e.target.value)
              }
            >
              {!store.lots.length && (
                <option value="">
                  Sin sucursales registradas
                </option>
              )}

              {store.lots
                .filter((lot) =>
                  canAccessLot(lot.id)
                )
                .map((lot) => (
                  <option
                    key={lot.id}
                    value={lot.id}
                  >
                    {lot.name}
                  </option>
                ))}
            </select>

          </div>
        </label>

        <button
          className="notification-button"
          aria-label="Notificaciones"
        >
          <Bell size={18} />

          {pendingCount > 0 && (
            <em>
              {pendingCount > 9
                ? "9+"
                : pendingCount}
            </em>
          )}
        </button>

        <button
          className={`online sync-button ${store.source}`}
          title={store.syncError}
          onClick={() => {
            if (
              store.source === "fallback"
            ) {
              onOpenLogin();
            }
          }}
        >
          <i />

          {store.source === "supabase"
            ? "En línea"
            : store.source === "loading"
            ? "Conectando…"
            : store.source === "offline"
            ? "Sin conexión"
            : "Conectar"}
        </button>

      </div>
    </header>
  );
}