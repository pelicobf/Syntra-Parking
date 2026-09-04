"use client";

import { ChevronRight } from "lucide-react";

import { nav } from "@/app/config/navigation";

import type { AppModule } from "@/app/types/parking";

type Props = {
  title: string;
  subtitle: string;
  items: typeof nav;
  onSelect: (module: AppModule) => void;
};

const descriptions: Record<AppModule, string> = {
  dashboard: "Indicadores clave y actividad reciente",
  entries: "Accesos, vehículos y cobros",
  vehicles: "Consulta de vehículos",
  shifts: "Turnos y puntos de cobro",
  cashCuts: "Conciliación de ventas y cobros",
  reports: "Analiza el rendimiento del estacionamiento",
  staff: "Accesos, roles y colaboradores",
  settings: "Tarifas, espacios y dispositivos",
};

export function MosaicModuleSection({
  title,
  subtitle,
  items,
  onSelect,
}: Props) {
  return (
    <section className="pos-module-section">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <b>
          {items.length}{" "}
          {items.length === 1
            ? "módulo"
            : "módulos"}
        </b>
      </header>

      <div className="pos-module-grid">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() =>
                onSelect(item.id)
              }
            >
              <span>
                <Icon />
              </span>

              <b>
                {item.label}

                <small>
                  {descriptions[item.id]}
                </small>
              </b>

              <ChevronRight />
            </button>
          );
        })}
      </div>
    </section>
  );
}