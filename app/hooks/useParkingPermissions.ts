"use client";

import { useParkingStore } from "@/app/hooks/use-parking-store";
import { modulePermissions } from "@/app/config/permissions";

import type { AppModule } from "@/app/types/parking";

export function useParkingPermissions() {
  const store = useParkingStore();

  const isSuperAdmin = store.profile.role === "super_admin";
  const isOwner = store.profile.role === "owner";

  function hasPermission(code: string) {
    return (
      isSuperAdmin ||
      isOwner ||
      store.profile.permissionCodes.includes("*") ||
      store.profile.permissionCodes.includes(code)
    );
  }

  function canViewModule(id: AppModule) {
    const permission = modulePermissions[id];

    if (!permission) {
      return true;
    }

    return hasPermission(permission);
  }

  function canAccessLot(id: string) {
    return (
      isSuperAdmin ||
      store.profile.allowedLotIds.includes(id)
    );
  }

  return {
    isSuperAdmin,
    isOwner,
    hasPermission,
    canViewModule,
    canAccessLot,
  };
}