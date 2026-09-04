import {
  ArrowRightLeft,
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  Settings2,
  Users,
  WalletCards,
} from "lucide-react";

export function AccessModuleIcon({
  id,
}: {
  id: string;
}) {
  if (id === "dashboard") {
    return <LayoutDashboard />;
  }

  if (id === "entries") {
    return <ArrowRightLeft />;
  }

  if (id === "shifts") {
    return <WalletCards />;
  }

  if (id === "cashCuts") {
    return <CalendarRange />;
  }

  if (id === "reports") {
    return <BarChart3 />;
  }

  if (id === "staff") {
    return <Users />;
  }

  return <Settings2 />;
}