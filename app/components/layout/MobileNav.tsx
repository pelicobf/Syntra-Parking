"use client";

import { ScanLine } from "lucide-react";

import { nav } from "@/app/config/navigation";
import { useParkingPermissions } from "@/app/hooks/useParkingPermissions";

import type { AppModule } from "@/app/types/parking";

type MobileNavProps = {
  module: AppModule;

  onModuleChange: (
    module: AppModule
  ) => void;

  onScan: () => void;
};

export function MobileNav({
  module,
  onModuleChange,
  onScan,
}: MobileNavProps) {
  const {
    canViewModule,
  } = useParkingPermissions();

  return (
    <nav className="mobile-nav">

      {nav
        .filter((item) =>
          canViewModule(item.id)
        )
        .map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={
                module === item.id
                  ? "active"
                  : ""
              }
              onClick={() =>
                onModuleChange(item.id)
              }
            >
              <span>
                <Icon size={18} />
              </span>

              <small>
                {item.label.split(" ")[0]}
              </small>
            </button>
          );
        })}

      <button
        className="scan-fab"
        onClick={onScan}
      >
        <ScanLine size={21} />
      </button>

    </nav>
  );
}