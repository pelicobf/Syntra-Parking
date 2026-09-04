



"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  Building2,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LogOut,
  ParkingCircle,
  Plus,
  ScanLine,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import type { SignInResult as SyntraSignInResult } from "@syntra/login";

import { TicketCodes } from "@/app/components/codes";

/* =========================================================
   COMPONENTES COMUNES
========================================================= */

import { Modal } from "@/app/components/common/Modal";
import { ModalHeader } from "@/app/components/common/ModalHeader";
import { Stat } from "@/app/components/common/Stat";

/* =========================================================
   LAYOUT
========================================================= */

import { AppShell } from "@/app/components/layout/AppShell";
import { Brand } from "@/app/components/layout/Brand";

/* =========================================================
   PARKING
========================================================= */

import { OperationSummary } from "@/app/components/parking/OperationSummary";
import { StayList } from "@/app/components/parking/StayList";

/* =========================================================
   DASHBOARD
========================================================= */

import { MosaicModuleSection } from "@/app/components/dashboard/MosaicModuleSection";

/* =========================================================
   SCANNER
========================================================= */

import { CameraScanner } from "@/app/components/scanner/CameraScanner";
/* =========================================================
   REPORTES
========================================================= */

import { CashCuts } from "@/app/components/reports/CashCuts";
import { Reports } from "@/app/components/reports/Reports";

/* =========================================================
   PERSONAL
========================================================= */

import { Staff } from "@/app/components/staff/Staff";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

import { Settings } from "@/app/components/settings/Settings";

/* =========================================================
   PLATAFORMA
========================================================= */

import { PlatformBusinessDashboard } from "@/app/components/platform/PlatformBusinessDashboard";

/* =========================================================
   AUTH
========================================================= */

import { LoginScreen } from "@/app/components/auth/LoginScreen";

/* =========================================================
   CONFIG
========================================================= */

import { nav } from "@/app/config/navigation";
import { getRoleLabel } from "@/app/config/roles";

/* =========================================================
   HOOKS
========================================================= */

import { useParkingStore } from "@/app/hooks/use-parking-store";
import { useParkingPermissions } from "@/app/hooks/useParkingPermissions";

/* =========================================================
   LIB
========================================================= */

import { currency, clock } from "@/app/lib/formatters";
import { displayPlate, minutesSince } from "@/app/lib/parking";

/* =========================================================
   TYPES
========================================================= */

import type {
  AppModule,
  ParkingStay,
  Payment,
} from "@/app/types/parking";

type ModalType =
  | "entry"
  | "checkout"
  | "camera"
  | "ticket"
  | "cashRegister"
  | "openShift"
  | "closeShift"
  | "login"
  | null;

const titles: Record<AppModule, [string, string]> = {
  dashboard: [
    "Resumen",
    "Panorama operativo en tiempo real",
  ],
  entries: [
    "Entradas y salidas",
    "Control de accesos, vehículos y cobros",
  ],
  vehicles: [
    "Entradas y salidas",
    "Control de accesos, vehículos y cobros",
  ],
  shifts: [
    "Cajas",
    "Administración de puntos de cobro",
  ],
  cashCuts: [
    "Cortes de caja",
    "Historial de cierres por usuario",
  ],
  reports: [
    "Reportes",
    "Indicadores de operación e ingresos",
  ],
  staff: [
    "Personal",
    "Usuarios, roles y sucursales",
  ],
  settings: [
    "Configuración",
    "Tarifas, espacios y dispositivos",
  ],
};

function duration(iso: string) {
  const mins = minutesSince(iso);

  return `${
    Math.floor(mins / 60)
      ? `${Math.floor(mins / 60)} h `
      : ""
  }${mins % 60} min`;
}

export default function Home() {
  const store = useParkingStore();

  const {
    hasPermission,
    canViewModule,
    canAccessLot,
  } = useParkingPermissions();

  /* =========================================================
     NAVEGACIÓN
  ========================================================= */

  const [module, setModule] =
    useState<AppModule>("dashboard");

  const [navigationMode, setNavigationMode] =
    useState<"sidebar" | "mosaic">("mosaic");

  const [
    mosaicDashboardOpen,
    setMosaicDashboardOpen,
  ] = useState(false);

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(false);

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] = useState(false);

  /* =========================================================
     UI
  ========================================================= */

  const [modal, setModal] =
    useState<ModalType>(null);

  const [toast, setToast] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [hydrated, setHydrated] =
    useState(false);

  /* =========================================================
     VEHÍCULO
  ========================================================= */

  const [query, setQuery] = useState("");

  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const [
    vehicleTypeId,
    setVehicleTypeId,
  ] = useState("");

  const [selected, setSelected] =
    useState<ParkingStay | null>(null);

  const [method, setMethod] =
    useState<Payment["method"]>("cash");

  /* =========================================================
     CAJA
  ========================================================= */

  const [
    registerName,
    setRegisterName,
  ] = useState("Caja principal");

  const [
    selectedRegisterId,
    setSelectedRegisterId,
  ] = useState("");

  const [
    openingCash,
    setOpeningCash,
  ] = useState(0);

  const [
    countedCash,
    setCountedCash,
  ] = useState(0);

  const [
    shiftNotes,
    setShiftNotes,
  ] = useState("");

  /* =========================================================
     LOGIN
  ========================================================= */

  const [authError, setAuthError] =
    useState("");

  const [
    loginPending,
    setLoginPending,
  ] = useState(false);

  const [syncEmail, setSyncEmail] =
    useState("");

  const [
    syncPassword,
    setSyncPassword,
  ] = useState("");

  /* =========================================================
     REFS
  ========================================================= */

  const scanInputRef =
    useRef<HTMLInputElement>(null);

  const modalRef =
    useRef<ModalType>(modal);

  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);

  /* =========================================================
     INICIALIZACIÓN
  ========================================================= */

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        "parkflow-navigation-mode",
      );

    if (saved === "sidebar") {
      setNavigationMode("sidebar");
      setModule("entries");
    } else if (saved === "mosaic") {
      setNavigationMode("mosaic");
    }

    setHydrated(true);
  }, []);

  function notify(message: string) {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2600);
  }

  function changeNavigationMode(
    mode: "sidebar" | "mosaic",
  ) {
    setNavigationMode(mode);

    setMobileSidebarOpen(false);
    setMosaicDashboardOpen(false);

    window.localStorage.setItem(
      "parkflow-navigation-mode",
      mode,
    );

    setModule(
      mode === "mosaic"
        ? "dashboard"
        : "entries",
    );

    notify(
      mode === "mosaic"
        ? "Inicio en mosaico activado"
        : "Menú lateral activado",
    );
  }

  function openMosaicModule(
    next: AppModule,
  ) {
    setModule(next);

    setMosaicDashboardOpen(
      next === "dashboard",
    );
  }

  /* =========================================================
     AUTOFOCUS SCANNER
  ========================================================= */

  useEffect(() => {
    if (
      (module === "entries" ||
        module === "vehicles") &&
      !modal
    ) {
      const id = window.setTimeout(() => {
        scanInputRef.current?.focus();
      }, 60);

      return () => {
        window.clearTimeout(id);
      };
    }
  }, [module, modal]);

  /* =========================================================
     APERTURA AUTOMÁTICA DE CAJA
  ========================================================= */

  useEffect(() => {
    if (
      (module === "entries" ||
        module === "vehicles") &&
      store.authState === "authenticated" &&
      hasPermission("shifts.manage") &&
      store.shift.status !== "open" &&
      !modal
    ) {
      const register =
        store.cashRegisters.find(
          (item) =>
            item.lotId === store.lotId,
        );

      setSelectedRegisterId(
        register?.id ?? "",
      );

      setRegisterName(
        register?.name ??
          "Caja principal",
      );

      setModal("openShift");
    }
  }, [
    module,
    store.authState,
    store.shift.status,
    store.lotId,
    store.profile.permissionCodes,
  ]);

  /* =========================================================
     VALIDAR PERMISOS
  ========================================================= */

  useEffect(() => {
    if (
      store.authState !==
        "authenticated" ||
      canViewModule(module)
    ) {
      return;
    }

    const nextModule = nav.find(
      (item) =>
        canViewModule(item.id),
    );

    setModule(
      nextModule?.id ?? "entries",
    );
  }, [
    store.authState,
    store.profile.permissionCodes,
    module,
  ]);

  /* =========================================================
     DATOS
  ========================================================= */

  const visibleStays =
    store.active.filter((stay) =>
      `${stay.plate} ${stay.make} ${stay.model} ${stay.folio} ${stay.barcodeValue}`
        .toLowerCase()
        .includes(
          query.toLowerCase(),
        ),
    );

  const activeFiltered =
    store.active.filter((stay) =>
      `${stay.plate} ${stay.make} ${stay.model} ${stay.folio}`
        .toLowerCase()
        .includes(
          query.toLowerCase(),
        ),
    );

  const pendingCount =
    store.active.filter(
      (stay) =>
        stay.status ===
        "pending_payment",
    ).length;

  const shiftPayments =
    store.payments.filter(
      (payment) =>
        store.source === "fallback"
          ? new Date(
              payment.paidAt,
            ).toDateString() ===
            new Date().toDateString()
          : payment.shiftId ===
            store.shift.id,
    );

  const revenue =
    shiftPayments.reduce(
      (total, payment) =>
        total + payment.amount,
      store.source === "fallback"
        ? 8420
        : 0,
    );

  const cashRevenue =
    shiftPayments
      .filter(
        (payment) =>
          payment.method === "cash",
      )
      .reduce(
        (total, payment) =>
          total + payment.amount,
        store.source === "fallback"
          ? 8420
          : 0,
      );

  const occupancy =
    store.lot.capacity > 0
      ? Math.round(
          (store.active.length /
            store.lot.capacity) *
            100,
        )
      : 0;

  const available =
    store.lot.capacity -
    store.active.length;

  const currentDate =
    new Intl.DateTimeFormat(
      "es-MX",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      },
    ).format(new Date());

  /* =========================================================
     SUSCRIPCIÓN
  ========================================================= */

  const subscriptionDays =
    store.businessSubscription.expiresAt
      ? Math.ceil(
          (new Date(
            store.businessSubscription
              .expiresAt,
          ).getTime() -
            Date.now()) /
            86400000,
        )
      : null;

  const subscriptionLabel =
    store.businessSubscription
      .planType === "annual"
      ? "Plan anual"
      : store.businessSubscription
          .planType === "monthly"
      ? "Plan mensual"
      : "Demostración";

  const subscriptionExpiry =
    subscriptionDays === null
      ? "Sin vencimiento"
      : subscriptionDays < 0
      ? `Vencido hace ${Math.abs(
          subscriptionDays,
        )} día${
          Math.abs(
            subscriptionDays,
          ) === 1
            ? ""
            : "s"
        }`
      : subscriptionDays === 0
      ? "Vence hoy"
      : `Vence en ${subscriptionDays} día${
          subscriptionDays === 1
            ? ""
            : "s"
        }`;

  const showSubscriptionNotice =
    store.businessSubscription
      .planType === "demo" ||
    (subscriptionDays !== null &&
      subscriptionDays <= 8);

  /* =========================================================
     ENTRADA
  ========================================================= */

  async function submitEntry(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (
      !hasPermission(
        "stays.create",
      )
    ) {
      notify(
        "Tu acceso es únicamente de consulta",
      );

      return;
    }

    if (!plate.trim()) {
      return;
    }

    setSaving(true);

    try {
      const stay =
        await store.registerEntry({
          plate,
          make,
          model,
          color,
          vehicleTypeId:
            vehicleTypeId ||
            store.vehicleTypes[0]
              ?.id,
        });

      setSelected(stay);

      setPlate("");
      setMake("");
      setModel("");
      setColor("");
      setVehicleTypeId("");

      setModal("ticket");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la entrada",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     CHECKOUT
  ========================================================= */

  function openCheckout(
    stay?: ParkingStay,
  ) {
    if (
      !hasPermission(
        "stays.checkout",
      ) ||
      !hasPermission(
        "payments.create",
      )
    ) {
      notify(
        "Tu acceso a Entradas y salidas es únicamente de consulta",
      );

      return;
    }

    if (
      store.shift.status !==
        "open" ||
      store.shift.lotId !==
        store.lotId
    ) {
      notify(
        "Debes abrir una caja antes de registrar cobros",
      );

      setModule("shifts");

      if (
        hasPermission(
          "shifts.manage",
        )
      ) {
        setModal("openShift");
      }

      return;
    }

    setSelected(
      stay ??
        store.active.find(
          (item) =>
            item.status ===
            "pending_payment",
        ) ??
        store.active[0] ??
        null,
    );

    setModal("checkout");
  }

  /* =========================================================
     SCANNER
  ========================================================= */

  function findScannedStay(
    value: string,
  ) {
    const code =
      value
        .trim()
        .toLowerCase();

    return store.active.find(
      (stay) =>
        [
          stay.barcodeValue,
          stay.qrToken,
          stay.folio,
          stay.plate,
        ].some(
          (candidate) =>
            candidate.toLowerCase() ===
            code,
        ) ||
        stay.qrToken
          .toLowerCase()
          .endsWith(code),
    );
  }

  function processScan(
    value: string,
  ) {
    const stay =
      findScannedStay(value);

    if (stay) {
      setQuery("");
      openCheckout(stay);
    } else {
      notify(
        "No encontramos un boleto activo con ese código",
      );
    }
  }

  function handleScanKey(
    e: KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key !== "Enter") {
      return;
    }

    e.preventDefault();

    if (query.trim()) {
      processScan(query);
    }
  }

  /* =========================================================
     COBRO
  ========================================================= */

  async function pay() {
    if (!selected) {
      return;
    }

    setSaving(true);

    try {
      const amount =
        await store.charge(
          selected,
          method,
        );

      setModal(null);

      notify(
        `Salida registrada · ${currency.format(
          amount,
        )}`,
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el cobro",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     CAJAS
  ========================================================= */

  async function submitOpenShift(
    e: FormEvent,
  ) {
    e.preventDefault();

    setSaving(true);

    try {
      const register =
        store.cashRegisters.find(
          (item) =>
            item.id ===
            selectedRegisterId,
        ) ??
        store.cashRegisters.find(
          (item) =>
            item.lotId ===
            store.lotId,
        );

      await store.openShift({
        registerId: register?.id,
        registerName:
          register?.name ??
          registerName,
        openingCash,
      });

      setModal(null);

      notify(
        "Caja abierta correctamente",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible abrir la caja",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitCashRegister(
    e: FormEvent,
  ) {
    e.preventDefault();

    setSaving(true);

    try {
      await store.createCashRegister({
        name: registerName,
      });

      setModal(null);

      notify(
        "Nueva caja creada correctamente",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible crear la caja",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitCloseShift(
    e: FormEvent,
  ) {
    e.preventDefault();

    setSaving(true);

    try {
      await store.closeShift({
        countedCash,
        expectedCash:
          cashRevenue +
          store.shift.openingCash,
        notes: shiftNotes,
      });

      setModal(null);
      setShiftNotes("");

      notify(
        "Turno cerrado correctamente",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible cerrar el turno",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  async function login(
    identifier: string,
    password: string,
  ): Promise<SyntraSignInResult> {
    setAuthError("");
    setLoginPending(true);

    try {
      await store.signIn(
        identifier,
        password,
      );

      setModal(null);

      notify(
        "Supabase conectado correctamente",
      );

      return {
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión";

      setAuthError(message);

      return {
        error: message,
      };
    } finally {
      setLoginPending(false);
    }
  }

  async function submitSyncLogin(
    e: FormEvent,
  ) {
    e.preventDefault();

    await login(
      syncEmail,
      syncPassword,
    );
  }

  async function registerBusiness(
    input: {
      name: string;
      slug: string;
      lotName: string;
      lotCode: string;
      capacity: number;
      ownerName: string;
      ownerEmail: string;
      ownerPassword: string;
    },
  ) {
    setSaving(true);
    setAuthError("");

    try {
      await store.registerBusiness(
        input,
      );

      notify(
        "Empresa creada correctamente",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible crear la empresa";

      setAuthError(message);

      throw error;
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     AUTH GUARDS
  ========================================================= */

  if (!hydrated) {
    return null;
  }

  if (
    store.authState === "checking" &&
    !loginPending &&
    !saving
  ) {
    return null;
  }

  if (
    store.authState !==
    "authenticated"
  ) {
    return (
      <LoginScreen
        error={
          authError ||
          store.syncError
        }
        saving={saving}
        onLogin={login}
        onRegister={
          registerBusiness
        }
      />
    );
  }

  if (
    store.profile.role ===
      "super_admin" &&
    !store.selectedBusinessId
  ) {
    return (
      <PlatformBusinessDashboard
        store={store}
      />
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <AppShell
        module={module}
        title={titles[module][0]}
        subtitle={titles[module][1]}
        navigationMode={
          navigationMode
        }
        sidebarCollapsed={
          sidebarCollapsed
        }
        mobileSidebarOpen={
          mobileSidebarOpen
        }
        pendingCount={
          pendingCount
        }
        onModuleChange={setModule}
        onToggleSidebar={() =>
          setSidebarCollapsed(
            (value) => !value,
          )
        }
        onOpenMobileSidebar={() =>
          setMobileSidebarOpen(true)
        }
        onCloseMobileSidebar={() =>
          setMobileSidebarOpen(false)
        }
        onHome={() => {
          setModule("dashboard");
          setMosaicDashboardOpen(
            false,
          );
        }}
        onScan={() =>
          setModal("camera")
        }
        onOpenLogin={() =>
          setModal("login")
        }
      >
        {/* OFFLINE */}

        {store.source ===
          "offline" && (
          <section
            className="offline-notice"
            role="alert"
          >
            <AlertTriangle
              size={18}
            />

            <div>
              <b>
                Operación bloqueada
                por falta de internet
              </b>

              <small>
                La información mostrada
                es la última
                sincronizada. No se
                registrarán entradas,
                cobros ni movimientos
                de caja hasta recuperar
                la conexión.
              </small>
            </div>
          </section>
        )}

        {/* SUSCRIPCIÓN */}

        {showSubscriptionNotice && (
          <section
            className={`subscription-notice ${
              store
                .businessSubscription
                .planType
            } ${
              subscriptionDays !==
                null &&
              subscriptionDays < 0
                ? "expired"
                : ""
            }`}
          >
            <span>
              {store
                .businessSubscription
                .planType ===
              "demo" ? (
                <Clock3 />
              ) : (
                <ParkingCircle />
              )}
            </span>

            <div>
              <b>
                {subscriptionLabel} ·{" "}
                {subscriptionExpiry}
              </b>

              <small>
                {store
                  .businessSubscription
                  .planType ===
                "demo"
                  ? "Todos tus datos se conservarán al contratar un plan."
                  : subscriptionDays !==
                      null &&
                    subscriptionDays <
                      0
                  ? "La vigencia terminó. Contacta al administrador de la plataforma para renovar."
                  : "Tu renovación se aproxima. Considera realizar el pago para mantener el servicio activo."}
              </small>
            </div>
          </section>
        )}

        {/* MOSAICO */}

        {module ===
          "dashboard" &&
          navigationMode ===
            "mosaic" &&
          !mosaicDashboardOpen && (
            <div className="pos-mosaic-home">

              <header className="pos-mosaic-header">

                <div className="pos-mosaic-heading">
                  <span>
                    <LayoutDashboard />
                  </span>

                  <div>
                    <h1>Inicio</h1>

                    <p>
                      Elige un módulo
                      para comenzar
                    </p>
                  </div>
                </div>

                <div className="pos-mosaic-context">

                  <div className="pos-context-card">
                    <span>
                      <Building2 />
                    </span>

                    <div>
                      <small>
                        EMPRESA
                      </small>

                      <b>
                        {
                          store.businessName
                        }
                      </b>
                    </div>
                  </div>

                  <label className="pos-context-card pos-branch-card">
                    <span>
                      <ParkingCircle />
                    </span>

                    <div>
                      <small>
                        SUCURSAL ACTIVA
                      </small>

                      <select
                        value={
                          store.lotId
                        }
                        disabled={
                          !store.lots
                            .length
                        }
                        onChange={(e) =>
                          store.setLotId(
                            e.target
                              .value,
                          )
                        }
                      >
                        {store.lots
                          .filter(
                            (lot) =>
                              canAccessLot(
                                lot.id,
                              ),
                          )
                          .map(
                            (lot) => (
                              <option
                                key={
                                  lot.id
                                }
                                value={
                                  lot.id
                                }
                              >
                                {
                                  lot.name
                                }
                              </option>
                            ),
                          )}
                      </select>
                    </div>
                  </label>

                  <button
                    className="pos-icon-button"
                    aria-label="Notificaciones"
                  >
                    <Bell />

                    {pendingCount >
                      0 && (
                      <em>
                        {pendingCount >
                        9
                          ? "9+"
                          : pendingCount}
                      </em>
                    )}
                  </button>

                  <div className="pos-user-card">

                    <span>
                      {store.profile.fullName
                        .split(" ")
                        .map(
                          (value) =>
                            value[0],
                        )
                        .join("")
                        .slice(0, 2)}
                    </span>

                    <div>
                      <b>
                        {
                          store.profile
                            .fullName
                        }
                      </b>

                      <small>
                        {getRoleLabel(
                          store.profile
                            .role,
                        )}
                      </small>
                    </div>

                  </div>

                  <button
                    className="pos-icon-button"
                    aria-label="Cerrar sesión"
                    onClick={() =>
                      void store.signOut()
                    }
                  >
                    <LogOut />
                  </button>

                </div>
              </header>

              {store
                .businessSubscription
                .planType ===
                "demo" && (
                <section
                  className={`pos-demo-notice ${
                    subscriptionDays !==
                      null &&
                    subscriptionDays <
                      0
                      ? "expired"
                      : ""
                  }`}
                >
                  <span>
                    <Clock3 />
                  </span>

                  <div>
                    <b>
                      Demostración ·{" "}
                      {
                        subscriptionExpiry
                      }
                    </b>

                    <small>
                      Todos tus datos
                      se conservarán al
                      contratar un
                      plan.
                    </small>
                  </div>
                </section>
              )}

              <div className="pos-mosaic-body">

                <section className="pos-mosaic-hero">

                  <div>
                    <p>
                      <i /> OPERACIÓN{" "}
                      {store.source ===
                      "supabase"
                        ? "LISTA"
                        : "EN CONSULTA"}
                    </p>

                    <h2>
                      Hola,{" "}
                      {
                        store.profile.fullName.split(
                          " ",
                        )[0]
                      }.
                      <span>
                        {" "}
                        (
                        {getRoleLabel(
                          store.profile
                            .role,
                        )}
                        )
                      </span>
                    </h2>

                    <small>
                      {store.source ===
                      "offline"
                        ? "Recupera la conexión para continuar operando."
                        : "Elige una herramienta para comenzar tu jornada."}
                    </small>
                  </div>

                  {canViewModule(
                    "entries",
                  ) && (
                    <button
                      onClick={() =>
                        setModule(
                          "entries",
                        )
                      }
                    >
                      <span>
                        <ArrowRightLeft />
                      </span>

                      <b>
                        Entradas y
                        salidas

                        <small>
                          Gestionar
                          accesos,
                          vehículos y
                          cobros
                        </small>
                      </b>

                      <ChevronRight />
                    </button>
                  )}

                </section>

                <MosaicModuleSection
                  title="Operación"
                  subtitle="Herramientas para el trabajo diario"
                  items={nav.filter(
                    (item) =>
                      ![
                        "staff",
                        "settings",
                      ].includes(
                        item.id,
                      ) &&
                      canViewModule(
                        item.id,
                      ),
                  )}
                  onSelect={
                    openMosaicModule
                  }
                />

                {nav.some(
                  (item) =>
                    [
                      "staff",
                      "settings",
                    ].includes(
                      item.id,
                    ) &&
                    canViewModule(
                      item.id,
                    ),
                ) && (
                  <div className="pos-admin-zone">

                    <span className="pos-admin-badge">
                      <ShieldCheck />
                      Acceso
                      administrativo
                    </span>

                    <MosaicModuleSection
                      title="Administración"
                      subtitle="Control y configuración del estacionamiento"
                      items={nav.filter(
                        (item) =>
                          [
                            "staff",
                            "settings",
                          ].includes(
                            item.id,
                          ) &&
                          canViewModule(
                            item.id,
                          ),
                      )}
                      onSelect={
                        openMosaicModule
                      }
                    />

                  </div>
                )}

              </div>
            </div>
          )}

        {/* DASHBOARD */}

        {module ===
          "dashboard" &&
          (navigationMode ===
            "sidebar" ||
            mosaicDashboardOpen) && (
            <div className="screen desktop-dashboard">

              <section className="intro dashboard-intro">

                <div>
                  <p className="eyebrow">
                    PANORAMA DEL
                    ESTACIONAMIENTO
                  </p>

                  <p>
                    Ocupación, ingresos
                    y operación en un
                    solo lugar.
                  </p>
                </div>

                <div className="dashboard-intro-actions">

                  <span className="date-badge">
                    <Clock3
                      size={16}
                    />

                    {currentDate}
                  </span>

                  <div className="intro-actions">

                    {hasPermission(
                      "stays.checkout",
                    ) &&
                      hasPermission(
                        "payments.create",
                      ) && (
                        <button
                          className="secondary"
                          onClick={() =>
                            openCheckout()
                          }
                        >
                          Procesar salida
                        </button>
                      )}

                    {hasPermission(
                      "stays.create",
                    ) && (
                      <button
                        className="primary"
                        onClick={() =>
                          setModal(
                            "entry",
                          )
                        }
                      >
                        ＋ Registrar
                        entrada
                      </button>
                    )}

                  </div>
                </div>
              </section>

              <section className="stats">

                <Stat
                  label="Vehículos dentro"
                  value={String(
                    store.active.length,
                  )}
                  hint={`${occupancy}% de ocupación`}
                  tone="green"
                  icon={CarFront}
                />

                <Stat
                  label="Espacios disponibles"
                  value={String(
                    available,
                  )}
                  hint={`de ${store.lot.capacity} totales`}
                  tone="blue"
                  icon={
                    ParkingCircle
                  }
                />

                <Stat
                  label="Ingresos del turno"
                  value={currency.format(
                    revenue,
                  )}
                  hint="Cobros confirmados"
                  tone="amber"
                  icon={
                    CircleDollarSign
                  }
                />

                <Stat
                  label="Tiempo promedio"
                  value="1 h 42 m"
                  hint="por vehículo"
                  tone="violet"
                  icon={Clock3}
                />

              </section>

              <section className="dash-grid">

                <article className="card activity">

                  <div className="card-head">

                    <div>
                      <p className="eyebrow">
                        OPERACIÓN EN
                        VIVO
                      </p>

                      <h3>
                        Vehículos
                        activos
                      </h3>
                    </div>

                    {hasPermission(
                      "stays.view",
                    ) && (
                      <button
                        onClick={() =>
                          setModule(
                            "entries",
                          )
                        }
                      >
                        Ver todos →
                      </button>
                    )}

                  </div>

                  <div className="search">
                    <span>⌕</span>

                    <input
                      value={query}
                      onChange={(e) =>
                        setQuery(
                          e.target
                            .value,
                        )
                      }
                      placeholder="Buscar placa, vehículo o folio"
                      aria-label="Buscar vehículos"
                    />
                  </div>

                  <StayList
                    stays={activeFiltered.slice(
                      0,
                      5,
                    )}
                    onOpen={
                      openCheckout
                    }
                    canOperate={
                      hasPermission(
                        "stays.checkout",
                      ) &&
                      hasPermission(
                        "payments.create",
                      )
                    }
                  />

                </article>

                <aside className="card quick">

                  <div className="card-head">
                    <div>
                      <p className="eyebrow">
                        ATAJOS
                      </p>

                      <h3>
                        Acciones rápidas
                      </h3>
                    </div>
                  </div>

                  {hasPermission(
                    "stays.create",
                  ) && (
                    <button
                      onClick={() =>
                        setModal(
                          "entry",
                        )
                      }
                    >
                      <span className="action-icon green">
                        ＋
                      </span>

                      <div>
                        <b>
                          Nueva entrada
                        </b>

                        <small>
                          Generar e
                          imprimir boleto
                        </small>
                      </div>

                      <i>›</i>
                    </button>
                  )}

                  {hasPermission(
                    "stays.checkout",
                  ) &&
                    hasPermission(
                      "payments.create",
                    ) && (
                      <button
                        onClick={() =>
                          openCheckout()
                        }
                      >
                        <span className="action-icon blue">
                          ⌗
                        </span>

                        <div>
                          <b>
                            Procesar salida
                          </b>

                          <small>
                            Escanear QR o
                            buscar placa
                          </small>
                        </div>

                        <i>›</i>
                      </button>
                    )}

                  {hasPermission(
                    "shifts.view",
                  ) && (
                    <button
                      onClick={() =>
                        setModule(
                          "shifts",
                        )
                      }
                    >
                      <span className="action-icon amber">
                        ▣
                      </span>

                      <div>
                        <b>Cajas</b>

                        <small>
                          Consultar puntos
                          de cobro
                        </small>
                      </div>

                      <i>›</i>
                    </button>
                  )}

                  {hasPermission(
                    "settings.view",
                  ) && (
                    <div className="rate-box">
                      <span>
                        Tarifa actual
                      </span>

                      <b>
                        {currency.format(
                          store.rate.price,
                        )}{" "}
                        <small>
                          /{" "}
                          {
                            store.rate
                              .fractionMinutes
                          }{" "}
                          min
                        </small>
                      </b>

                      {hasPermission(
                        "rates.manage",
                      ) && (
                        <button
                          onClick={() =>
                            setModule(
                              "settings",
                            )
                          }
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  )}

                </aside>

              </section>

              <section className="system-bar">

                <div>
                  <i />

                  <span>
                    <b>
                      Sistema operando
                      correctamente
                    </b>

                    <small>
                      Datos guardados y
                      dispositivos listos
                    </small>
                  </span>
                </div>

                <p>
                  Impresora{" "}
                  <b>● Conectada</b>
                </p>

                <p>
                  Lector QR{" "}
                  <b>● Listo</b>
                </p>

              </section>

            </div>
          )}

        {/* ENTRADAS Y SALIDAS */}

        {(module === "entries" ||
          module ===
            "vehicles") && (
          <div className="screen stays-screen">

            <OperationSummary
              active={
                store.active.length
              }
              available={available}
              capacity={
                store.lot.capacity
              }
              occupancy={occupancy}
              pending={
                pendingCount
              }
            />

            <section className="scan-workspace scan-workspace-inline">

              <div className="scan-input">

                <ScanLine
                  size={20}
                />

                <input
                  ref={scanInputRef}
                  value={query}
                  onChange={(e) =>
                    setQuery(
                      e.target.value,
                    )
                  }
                  onKeyDown={
                    handleScanKey
                  }
                  onBlur={() =>
                    window.setTimeout(
                      () => {
                        if (
                          !modalRef.current
                        ) {
                          scanInputRef.current?.focus();
                        }
                      },
                      100,
                    )
                  }
                  placeholder="Escanea QR / código de barras o escribe placa, folio, marca…"
                  aria-label="Escanear boleto o buscar vehículo"
                  autoComplete="off"
                  inputMode="search"
                />

                <kbd>ENTER</kbd>

              </div>

              <button
                type="button"
                className="camera-inline-button"
                onClick={() =>
                  setModal(
                    "camera",
                  )
                }
              >
                <ScanLine
                  size={19}
                />

                <span>
                  Usar cámara
                </span>
              </button>

              {hasPermission(
                "stays.create",
              ) && (
                <button
                  type="button"
                  className="primary entry-inline-button"
                  onClick={() =>
                    setModal(
                      "entry",
                    )
                  }
                >
                  <Plus
                    size={19}
                  />

                  <span>
                    Nueva entrada
                  </span>
                </button>
              )}

              <p>
                <i /> Lector conectado
                y esperando código
              </p>

            </section>

            <article className="card list-card">

              <div className="daily-list-heading">

                <div>
                  <h3>
                    Vehículos activos
                  </h3>
                </div>

                <div className="entry-shift-actions">

                  <div
                    className={`entry-shift-badge ${store.shift.status}`}
                  >
                    <i />

                    {store.shift
                      .status ===
                    "open"
                      ? `${
                          store.cashRegisters.find(
                            (item) =>
                              item.id ===
                              store.shift
                                .cashRegisterId,
                          )?.name ??
                          "Caja"
                        } abierta`
                      : "Caja cerrada"}
                  </div>

                  {hasPermission(
                    "shifts.manage",
                  ) &&
                    store.shift
                      .status ===
                      "open" && (
                      <button
                        className="close-register-button"
                        onClick={() => {
                          setCountedCash(
                            cashRevenue +
                              store.shift
                                .openingCash,
                          );

                          setModal(
                            "closeShift",
                          );
                        }}
                      >
                        <WalletCards
                          size={14}
                        />
                        Cerrar caja
                      </button>
                    )}

                </div>

                <span>
                  {
                    visibleStays.length
                  }{" "}
                  {visibleStays.length ===
                  1
                    ? "vehículo"
                    : "vehículos"}
                </span>

              </div>

              <div className="list-head">
                <span>Vehículo</span>
                <span>Entrada</span>
                <span>Tiempo</span>
                <span>
                  Estado y acción
                </span>
              </div>

              <StayList
                stays={
                  visibleStays
                }
                onOpen={
                  openCheckout
                }
                canOperate={
                  hasPermission(
                    "stays.checkout",
                  ) &&
                  hasPermission(
                    "payments.create",
                  )
                }
              />

            </article>

          </div>
        )}

        {/* CAJAS */}

        {module ===
          "shifts" && (
          <section className="screen register-catalog">

            <div className="register-catalog-head">

              <div>
                <p className="eyebrow">
                  PUNTOS DE COBRO
                </p>

                <h2>
                  Cajas de la
                  sucursal
                </h2>

                <p>
                  {hasPermission(
                    "shifts.manage",
                  )
                    ? "Selecciona una caja disponible para abrir el siguiente turno."
                    : "Consulta el estado de las cajas asignadas a tu sucursal."}
                </p>
              </div>

              {hasPermission(
                "shifts.manage",
              ) && (
                <button
                  className="secondary"
                  onClick={() => {
                    setRegisterName(
                      "",
                    );

                    setModal(
                      "cashRegister",
                    );
                  }}
                >
                  <Plus
                    size={16}
                  />
                  Nueva caja
                </button>
              )}

            </div>

            <div className="register-grid">

              {store.cashRegisters.filter(
                (register) =>
                  register.lotId ===
                  store.lotId,
              ).length ? (
                store.cashRegisters
                  .filter(
                    (register) =>
                      register.lotId ===
                      store.lotId,
                  )
                  .map((register) => {
                    const isOpen =
                      store.shift
                        .status ===
                        "open" &&
                      store.shift
                        .cashRegisterId ===
                        register.id;

                    return (
                      <article
                        className={`card register-card ${
                          isOpen
                            ? "open"
                            : ""
                        }`}
                        key={
                          register.id
                        }
                      >
                        <span>
                          <WalletCards />
                        </span>

                        <div>
                          <small>
                            {
                              register.code
                            }
                          </small>

                          <h3>
                            {
                              register.name
                            }
                          </h3>

                          <p>
                            {isOpen
                              ? `Turno abierto por ${store.shift.openedBy}`
                              : "Disponible para abrir turno"}
                          </p>
                        </div>

                        <em>
                          <i />

                          {isOpen
                            ? "Abierta"
                            : "Disponible"}
                        </em>

                        {hasPermission(
                          "shifts.manage",
                        ) &&
                          !isOpen &&
                          store.shift
                            .status !==
                            "open" && (
                            <button
                              className="secondary"
                              onClick={() => {
                                setSelectedRegisterId(
                                  register.id,
                                );

                                setRegisterName(
                                  register.name,
                                );

                                setModal(
                                  "openShift",
                                );
                              }}
                            >
                              Abrir
                            </button>
                          )}
                      </article>
                    );
                  })
              ) : (
                <article className="card register-empty">

                  <WalletCards />

                  <p>
                    No hay cajas
                    registradas en esta
                    sucursal.
                  </p>

                  {hasPermission(
                    "shifts.manage",
                  ) && (
                    <button
                      className="primary"
                      onClick={() => {
                        setRegisterName(
                          "",
                        );

                        setModal(
                          "cashRegister",
                        );
                      }}
                    >
                      Crear primera
                      caja
                    </button>
                  )}

                </article>
              )}

            </div>
          </section>
        )}

        {/* PANTALLAS EXTRAÍDAS */}

        {module ===
          "cashCuts" && (
          <CashCuts
            store={store}
          />
        )}

        {module ===
          "reports" && (
          <Reports
            store={store}
          />
        )}

        {module ===
          "staff" && (
          <Staff
            store={store}
            notify={notify}
          />
        )}

        {module ===
          "settings" && (
          <Settings
            store={store}
            notify={notify}
            navigationMode={
              navigationMode
            }
            onNavigationModeChange={
              changeNavigationMode
            }
          />
        )}

      </AppShell>

      {/* =====================================================
          MODALES
      ===================================================== */}

      <Modal
        open={modal !== null}
        onClose={() =>
          setModal(null)
        }
      >

        {/* NUEVA ENTRADA */}

        {modal === "entry" && (
          <form
            onSubmit={submitEntry}
          >
            <ModalHeader
              overline="NUEVA ENTRADA"
              title="Registra el vehículo"
              text="Selecciona el tipo de unidad para aplicar automáticamente su tarifa."
            />

            <label>
              Tipo de unidad

              <select
                autoFocus
                value={
                  vehicleTypeId ||
                  store
                    .vehicleTypes[0]
                    ?.id ||
                  ""
                }
                onChange={(e) =>
                  setVehicleTypeId(
                    e.target.value,
                  )
                }
                required
              >
                {store.vehicleTypes.map(
                  (type) => (
                    <option
                      key={
                        type.id
                      }
                      value={
                        type.id
                      }
                    >
                      {type.name}
                    </option>
                  ),
                )}
              </select>

              <small>
                La tarifa se
                calculará con base en
                esta clasificación.
              </small>
            </label>

            <label>
              Placas

              <input
                value={plate}
                onChange={(e) =>
                  setPlate(
                    displayPlate(
                      e.target
                        .value,
                    ),
                  )
                }
                placeholder="ABC-123-A"
                required
              />
            </label>

            <div className="form-grid">

              <label>
                Marca

                <input
                  value={make}
                  onChange={(e) =>
                    setMake(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Ej. Nissan"
                />
              </label>

              <label>
                Modelo

                <input
                  value={model}
                  onChange={(e) =>
                    setModel(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Ej. Versa"
                />
              </label>

            </div>

            <label>
              Color

              <input
                value={color}
                onChange={(e) =>
                  setColor(
                    e.target.value,
                  )
                }
                placeholder="Ej. Gris"
              />
            </label>

            <button
              className="primary full"
              type="submit"
              disabled={
                saving ||
                !store
                  .vehicleTypes
                  .length
              }
            >
              {saving
                ? "Guardando…"
                : "Generar boleto →"}
            </button>

          </form>
        )}

        {/* TICKET */}

        {modal ===
          "ticket" &&
          selected && (
            <div className="ticket-modal">

              <ModalHeader
                overline="ENTRADA REGISTRADA"
                title="Boleto listo"
                text="Código generado correctamente."
              />

              <div className="paper-ticket">

                <Brand />

                <h3>
                  {selected.plate}
                </h3>

                <p>
                  {selected.folio}
                </p>

                <TicketCodes
                  token={
                    selected.qrToken
                  }
                  barcode={
                    selected.barcodeValue
                  }
                />

                <dl>
                  <div>
                    <dt>
                      Entrada
                    </dt>

                    <dd>
                      {clock.format(
                        new Date(
                          selected.enteredAt,
                        ),
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Tarifa
                    </dt>

                    <dd>
                      {currency.format(
                        store.rate
                          .price,
                      )}{" "}
                      /{" "}
                      {
                        store.rate
                          .fractionMinutes
                      }{" "}
                      min
                    </dd>
                  </div>
                </dl>

                <small>
                  Conserva este boleto
                  para registrar tu
                  salida.
                </small>

              </div>

              <button
                className="primary full"
                onClick={() => {
                  notify(
                    "Boleto enviado a la impresora térmica",
                  );

                  window.setTimeout(
                    () =>
                      window.print(),
                    300,
                  );
                }}
              >
                ▣ Imprimir boleto
              </button>

            </div>
          )}

        {/* CHECKOUT */}

        {modal ===
          "checkout" && (
          <div>

            <ModalHeader
              overline="SALIDA IDENTIFICADA"
              title="Confirmar cobro"
              text="Verifica el vehículo y selecciona el método de pago."
            />

            <label>
              Vehículo

              <select
                value={
                  selected?.id ??
                  ""
                }
                onChange={(e) =>
                  setSelected(
                    store.active.find(
                      (stay) =>
                        stay.id ===
                        e.target
                          .value,
                    ) ?? null,
                  )
                }
              >
                <option value="">
                  Selecciona una
                  placa
                </option>

                {store.active.map(
                  (stay) => (
                    <option
                      key={
                        stay.id
                      }
                      value={
                        stay.id
                      }
                    >
                      {stay.plate} ·{" "}
                      {stay.folio}
                    </option>
                  ),
                )}
              </select>
            </label>

            {selected && (
              <>
                <div className="charge checkout-charge">

                  <span className="vehicle-icon">
                    <CarFront
                      size={19}
                    />
                  </span>

                  <div>
                    <b>
                      {
                        selected.plate
                      }
                    </b>

                    <small>
                      {duration(
                        selected.enteredAt,
                      )}{" "}
                      ·{" "}
                      {
                        selected.folio
                      }
                    </small>
                  </div>

                  <strong>
                    {currency.format(
                      store.calculate(
                        selected,
                      ),
                    )}
                  </strong>

                </div>

                <p className="payment-label">
                  Método de pago
                </p>

                <div className="methods">

                  {(
                    [
                      "cash",
                      "card",
                      "transfer",
                    ] as const
                  ).map(
                    (
                      paymentMethod,
                    ) => (
                      <button
                        type="button"
                        key={
                          paymentMethod
                        }
                        className={
                          method ===
                          paymentMethod
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setMethod(
                            paymentMethod,
                          )
                        }
                      >
                        {paymentMethod ===
                        "cash"
                          ? "Efectivo"
                          : paymentMethod ===
                            "card"
                          ? "Tarjeta"
                          : "Transferencia"}
                      </button>
                    ),
                  )}

                </div>

                <button
                  className="primary full"
                  type="button"
                  onClick={() =>
                    void pay()
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Procesando…"
                    : `Cobrar ${currency.format(
                        store.calculate(
                          selected,
                        ),
                      )}`}
                </button>

              </>
            )}

          </div>
        )}

        {/* CAMERA */}

        {modal ===
          "camera" && (
          <CameraScanner
            onDetected={(
              value,
            ) => {
              const stay =
                findScannedStay(
                  value,
                );

              if (stay) {
                openCheckout(
                  stay,
                );
              } else {
                notify(
                  "El código leído no corresponde a una estancia activa",
                );
              }
            }}
          />
        )}

        {/* NUEVA CAJA */}

        {modal ===
          "cashRegister" && (
          <form
            onSubmit={
              submitCashRegister
            }
            className="shift-form"
          >
            <ModalHeader
              overline="NUEVA CAJA"
              title="Agregar punto de cobro"
              text={`Crea una caja adicional para ${store.lot.name}.`}
            />

            <div className="shift-form-icon">

              <WalletCards />

              <div>
                <b>
                  Caja adicional
                </b>

                <small>
                  Después podrás
                  seleccionarla por su
                  nombre al abrir un
                  turno.
                </small>
              </div>

            </div>

            <label>
              Nombre de la caja

              <input
                autoFocus
                value={
                  registerName
                }
                onChange={(e) =>
                  setRegisterName(
                    e.target.value,
                  )
                }
                placeholder="Ej. Caja salida norte"
                required
              />
            </label>

            <button
              className="primary full"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Creando caja…"
                : "Crear caja"}
            </button>

          </form>
        )}

        {/* ABRIR TURNO */}

        {modal ===
          "openShift" && (
          <form
            onSubmit={
              submitOpenShift
            }
            className="shift-form"
          >
            <ModalHeader
              overline="APERTURA DE CAJA"
              title="Abrir nuevo turno"
              text={`Selecciona la caja y registra el fondo inicial para ${store.lot.name}.`}
            />

            <div className="shift-form-icon">

              <WalletCards />

              <div>
                <b>
                  Control de cobros
                </b>

                <small>
                  Todos los pagos
                  quedarán vinculados
                  a este turno.
                </small>
              </div>

            </div>

            {store.cashRegisters.filter(
              (register) =>
                register.lotId ===
                store.lotId,
            ).length ? (
              <label>
                Caja

                <select
                  autoFocus
                  value={
                    selectedRegisterId ||
                    store.cashRegisters.find(
                      (register) =>
                        register.lotId ===
                        store.lotId,
                    )?.id ||
                    ""
                  }
                  onChange={(e) => {
                    const register =
                      store.cashRegisters.find(
                        (item) =>
                          item.id ===
                          e.target
                            .value,
                      );

                    setSelectedRegisterId(
                      e.target.value,
                    );

                    setRegisterName(
                      register?.name ??
                        "",
                    );
                  }}
                >
                  {store.cashRegisters
                    .filter(
                      (register) =>
                        register.lotId ===
                        store.lotId,
                    )
                    .map(
                      (register) => (
                        <option
                          key={
                            register.id
                          }
                          value={
                            register.id
                          }
                        >
                          {
                            register.name
                          }{" "}
                          ·{" "}
                          {
                            register.code
                          }
                        </option>
                      ),
                    )}
                </select>

                <small>
                  ¿Necesitas otra?
                  Créala desde “Nueva
                  caja”.
                </small>
              </label>
            ) : (
              <label>
                Nombre de la primera
                caja

                <input
                  autoFocus
                  value={
                    registerName
                  }
                  onChange={(e) =>
                    setRegisterName(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Caja principal"
                  required
                />
              </label>
            )}

            <label>
              Fondo inicial

              <div className="input-affix">
                <span>$</span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    openingCash
                  }
                  onChange={(e) =>
                    setOpeningCash(
                      Number(
                        e.target
                          .value,
                      ),
                    )
                  }
                  required
                />

                <span>MXN</span>
              </div>
            </label>

            <div className="creation-summary">
              <CheckCircle2 />

              <p>
                Al abrir la caja se
                habilitarán los cobros
                en esta sucursal.
              </p>
            </div>

            <button
              className="primary full"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Abriendo caja…"
                : "Abrir caja y comenzar"}
            </button>

          </form>
        )}

        {/* CERRAR TURNO */}

        {modal ===
          "closeShift" && (
          <form
            onSubmit={
              submitCloseShift
            }
          >
            <ModalHeader
              overline="CIERRE DE TURNO"
              title="Corte de caja"
              text="Confirma el efectivo contado antes de cerrar."
            />

            <label>
              Efectivo contado

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  countedCash
                }
                onChange={(e) =>
                  setCountedCash(
                    Number(
                      e.target.value,
                    ),
                  )
                }
                required
              />
            </label>

            <label>
              Notas del cierre

              <input
                value={
                  shiftNotes
                }
                onChange={(e) =>
                  setShiftNotes(
                    e.target.value,
                  )
                }
                placeholder="Opcional: diferencias, retiros u observaciones"
              />
            </label>

            <div className="charge">

              <div>
                <b>
                  Efectivo esperado
                </b>

                <small>
                  Fondo + cobros en
                  efectivo
                </small>
              </div>

              <strong>
                {currency.format(
                  cashRevenue +
                    store.shift
                      .openingCash,
                )}
              </strong>

            </div>

            <div
              className={`cash-difference ${
                countedCash -
                  (cashRevenue +
                    store.shift
                      .openingCash) ===
                0
                  ? "balanced"
                  : "unbalanced"
              }`}
            >
              <span>
                Diferencia
              </span>

              <b>
                {currency.format(
                  countedCash -
                    (cashRevenue +
                      store.shift
                        .openingCash),
                )}
              </b>
            </div>

            <button
              className="primary full"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Cerrando turno…"
                : "Confirmar corte"}
            </button>

          </form>
        )}

        {/* LOGIN DE SINCRONIZACIÓN */}

        {modal === "login" && (
          <form
            onSubmit={
              submitSyncLogin
            }
          >
            <ModalHeader
              overline="SINCRONIZACIÓN"
              title="Conectar con Supabase"
              text="Inicia sesión con un usuario asignado al estacionamiento."
            />

            <label>
              Correo electrónico

              <input
                type="email"
                autoFocus
                value={
                  syncEmail
                }
                onChange={(e) =>
                  setSyncEmail(
                    e.target.value,
                  )
                }
                placeholder="usuario@empresa.com"
                required
              />
            </label>

            <label>
              Contraseña

              <input
                type="password"
                value={
                  syncPassword
                }
                onChange={(e) =>
                  setSyncPassword(
                    e.target.value,
                  )
                }
                placeholder="••••••••"
                required
              />
            </label>

            <button
              className="primary full"
              type="submit"
              disabled={
                loginPending
              }
            >
              {loginPending
                ? "Conectando…"
                : "Iniciar sesión"}
            </button>

          </form>
        )}

      </Modal>

      {toast && (
        <div className="toast">
          ● {toast}
        </div>
      )}

    </>
  );
}