"use client";

import type {
  ReactNode,
} from "react";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

import type { AppModule } from "@/app/types/parking";

type AppShellProps = {
  children: ReactNode;

  module: AppModule;

  title: string;
  subtitle: string;

  navigationMode:
    | "sidebar"
    | "mosaic";

  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;

  pendingCount: number;

  onModuleChange: (
    module: AppModule
  ) => void;

  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  onCloseMobileSidebar: () => void;

  onHome: () => void;
  onScan: () => void;
  onOpenLogin: () => void;
};

export function AppShell({
  children,

  module,

  title,
  subtitle,

  navigationMode,

  sidebarCollapsed,
  mobileSidebarOpen,

  pendingCount,

  onModuleChange,

  onToggleSidebar,
  onOpenMobileSidebar,
  onCloseMobileSidebar,

  onHome,
  onScan,
  onOpenLogin,
}: AppShellProps) {
  return (
    <div
      className={`
        shell
        nav-mode-${navigationMode}
        ${
          sidebarCollapsed
            ? "sidebar-is-collapsed"
            : ""
        }
        ${
          mobileSidebarOpen
            ? "mobile-sidebar-open"
            : ""
        }
      `}
    >

      {mobileSidebarOpen && (
        <button
          className="mobile-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={
            onCloseMobileSidebar
          }
        />
      )}

      <Sidebar
        module={module}
        collapsed={sidebarCollapsed}
        onModuleChange={
          onModuleChange
        }
        onToggleCollapsed={
          onToggleSidebar
        }
        onCloseMobile={
          onCloseMobileSidebar
        }
      />

      <main>

        <Topbar
          module={module}
          title={title}
          subtitle={subtitle}
          navigationMode={
            navigationMode
          }
          pendingCount={
            pendingCount
          }
          onHome={onHome}
          onOpenMobile={
            onOpenMobileSidebar
          }
          onOpenLogin={
            onOpenLogin
          }
        />

        {children}

      </main>

      <MobileNav
        module={module}
        onModuleChange={
          onModuleChange
        }
        onScan={onScan}
      />

    </div>
  );
}