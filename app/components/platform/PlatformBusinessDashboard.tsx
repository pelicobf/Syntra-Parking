"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ParkingCircle,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { Brand } from "@/app/components/layout/Brand";
import { useParkingStore } from "@/app/hooks/use-parking-store";
import {
  clock,
  currency,
} from "@/app/lib/formatters";

type ParkingStore = ReturnType<
  typeof useParkingStore
>;

type Props = {
  store: ParkingStore;
};

export function PlatformBusinessDashboard({
  store,
}: Props) {
  type PlatformBusiness =
    (typeof store.platformBusinesses)[number];

  const [
    platformModule,
    setPlatformModule,
  ] = useState<
    "overview" | "businesses" | "finances"
  >("overview");

  const [
    financePeriod,
    setFinancePeriod,
  ] = useState<
    "30" | "90" | "year" | "all"
  >("30");

  const [
    financeQuery,
    setFinanceQuery,
  ] = useState("");

  const [query, setQuery] =
    useState("");

  const [opening, setOpening] =
    useState("");

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const [dialog, setDialog] =
    useState<
      | "detail"
      | "payment"
      | "suspend"
      | "reactivate"
      | "delete"
    >("detail");

  const [saving, setSaving] =
    useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [planType, setPlanType] =
    useState<
      "demo" | "monthly" | "annual"
    >("demo");

  const [
    durationDays,
    setDurationDays,
  ] = useState(15);

  const [maxLots, setMaxLots] =
    useState(1);

  const [
    planPrice,
    setPlanPrice,
  ] = useState(0);

  const [
    suspensionType,
    setSuspensionType,
  ] = useState<
    "temporary" | "permanent"
  >("temporary");

  const [reason, setReason] =
    useState("");

  const [
    confirmation,
    setConfirmation,
  ] = useState("");

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const monthEnd = new Date(
    new Date().setMonth(
      new Date().getMonth() + 1,
    ),
  )
    .toISOString()
    .slice(0, 10);

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState(0);

  const [
    periodStart,
    setPeriodStart,
  ] = useState(today);

  const [periodEnd, setPeriodEnd] =
    useState(monthEnd);

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("transfer");

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    paymentNotes,
    setPaymentNotes,
  ] = useState("");

  /* =========================================================
     DATOS
  ========================================================= */

  const businesses =
    store.platformBusinesses.filter(
      (business) =>
        `${business.name} ${business.slug} ${business.ownerName} ${business.planType}`
          .toLowerCase()
          .includes(
            query.toLowerCase(),
          ),
    );

  const selected =
    store.platformBusinesses.find(
      (business) =>
        business.id === selectedId,
    ) ?? null;

  const activeBusinesses =
    store.platformBusinesses.filter(
      (business) =>
        business.active,
    ).length;

  const paidPlans =
    store.platformBusinesses.filter(
      (business) =>
        business.planType !==
        "demo",
    ).length;

  /* =========================================================
     FINANZAS
  ========================================================= */

  const financeStart =
    financePeriod === "all"
      ? 0
      : (() => {
          const date =
            new Date();

          if (
            financePeriod ===
            "year"
          ) {
            date.setMonth(0, 1);
          } else {
            date.setDate(
              date.getDate() -
                Number(
                  financePeriod,
                ),
            );
          }

          date.setHours(
            0,
            0,
            0,
            0,
          );

          return date.getTime();
        })();

  const financeRows =
    store.platformSubscriptionPayments.filter(
      (payment) => {
        const business =
          store.platformBusinesses.find(
            (item) =>
              item.id ===
              payment.businessId,
          );

        const text =
          `${
            business?.name ?? ""
          } ${
            business?.ownerName ??
            ""
          } ${
            payment.reference ??
            ""
          } ${payment.paymentMethod}`.toLowerCase();

        return (
          new Date(
            payment.paidAt,
          ).getTime() >=
            financeStart &&
          text.includes(
            financeQuery.toLowerCase(),
          )
        );
      },
    );

  const financeTotal =
    financeRows.reduce(
      (total, payment) =>
        total + payment.amount,
      0,
    );

  const annualIncome =
    financeRows
      .filter(
        (payment) =>
          payment.planType ===
          "annual",
      )
      .reduce(
        (total, payment) =>
          total + payment.amount,
        0,
      );

  const monthlyIncome =
    financeRows
      .filter(
        (payment) =>
          payment.planType ===
          "monthly",
      )
      .reduce(
        (total, payment) =>
          total + payment.amount,
        0,
      );

  /* =========================================================
     HELPERS
  ========================================================= */

  const planLabel = (
    type: string,
  ) =>
    type === "annual"
      ? "Plan anual"
      : type === "monthly"
        ? "Plan mensual"
        : "Demostración";

  const planStatus = (
    expiresAt: string | null,
  ) => {
    if (!expiresAt) {
      return "Sin vencimiento";
    }

    const days = Math.ceil(
      (new Date(
        expiresAt,
      ).getTime() -
        Date.now()) /
        86400000,
    );

    if (days < 0) {
      return "Plan vencido";
    }

    if (days === 0) {
      return "Vence hoy";
    }

    return `${days} días restantes`;
  };

  /* =========================================================
     ACCIONES
  ========================================================= */

  const openBusiness = async (
    id: string,
  ) => {
    setOpening(id);

    try {
      await store.selectPlatformBusiness(
        id,
      );
    } finally {
      setOpening("");
    }
  };

  function openDetail(
    business: PlatformBusiness,
  ) {
    const remaining =
      business.planExpiresAt
        ? Math.max(
            1,
            Math.ceil(
              (new Date(
                business.planExpiresAt,
              ).getTime() -
                Date.now()) /
                86400000,
            ),
          )
        : business.planType ===
            "annual"
          ? 365
          : business.planType ===
              "monthly"
            ? 30
            : 15;

    setSelectedId(business.id);

    setPlanType(
      business.planType,
    );

    setDurationDays(remaining);

    setMaxLots(
      business.maxLots,
    );

    setPlanPrice(
      business.planPrice ?? 0,
    );

    setPaymentAmount(
      business.planPrice ?? 0,
    );

    setSuspensionType(
      "temporary",
    );

    setReason("");
    setConfirmation("");
    setFormError("");
    setDialog("detail");
  }

  function closeDetail() {
    if (saving) {
      return;
    }

    setSelectedId("");
    setFormError("");
    setConfirmation("");
  }

  async function savePlan(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (!selected) {
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await store.updatePlatformBusinessPlan(
        {
          businessId:
            selected.id,
          planType,
          durationDays,
          maxLots,
          planPrice,
        },
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el plan",
      );
    } finally {
      setSaving(false);
    }
  }

  async function recordPayment(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (!selected) {
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await store.recordPlatformSubscriptionPayment(
        {
          businessId:
            selected.id,
          amount:
            paymentAmount,
          periodStart,
          periodEnd,
          paymentMethod,
          reference:
            paymentReference,
          notes: paymentNotes,
        },
      );

      setPaymentReference("");
      setPaymentNotes("");

      setDialog("detail");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el pago",
      );
    } finally {
      setSaving(false);
    }
  }

  async function suspendBusiness(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (!selected) {
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await store.setPlatformBusinessActive(
        {
          businessId:
            selected.id,
          active: false,
          suspensionType,
          reason,
        },
      );

      setDialog("detail");
      setReason("");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible suspender la empresa",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reactivateBusiness() {
    if (!selected) {
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await store.setPlatformBusinessActive(
        {
          businessId:
            selected.id,
          active: true,
        },
      );

      setDialog("detail");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible reactivar la empresa",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeBusiness(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (!selected) {
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await store.deletePlatformBusiness(
        {
          businessId:
            selected.id,
          confirmation,
        },
      );

      setSelectedId("");
      setConfirmation("");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar la empresa",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     EXPORTAR CSV
  ========================================================= */

  function exportPlatformPayments() {
    const lines = [
      [
        "Fecha",
        "Empresa",
        "Propietario",
        "Plan",
        "Periodo inicial",
        "Periodo final",
        "Método",
        "Referencia",
        "Importe",
        "Notas",
      ],

      ...financeRows.map(
        (payment) => {
          const business =
            store.platformBusinesses.find(
              (item) =>
                item.id ===
                payment.businessId,
            );

          return [
            new Date(
              payment.paidAt,
            ).toLocaleString(
              "es-MX",
            ),

            business?.name ??
              "Empresa eliminada",

            business?.ownerName ??
              "",

            payment.planType ===
            "annual"
              ? "Anual"
              : "Mensual",

            payment.periodStart,
            payment.periodEnd,
            payment.paymentMethod,

            payment.reference ??
              "",

            String(
              payment.amount,
            ),

            payment.notes ?? "",
          ];
        },
      ),
    ];

    const blob = new Blob(
      [
        "\ufeff" +
          lines
            .map((row) =>
              row
                .map(
                  (value) =>
                    `"${String(
                      value,
                    ).replaceAll(
                      '"',
                      '""',
                    )}"`,
                )
                .join(","),
            )
            .join("\n"),
      ],
      {
        type: "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      `finanzas-parkflow-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="platform-dashboard">

      {/* HEADER */}

      <header className="platform-dashboard-header">

        <Brand />

        <div className="platform-header-session">

          <div className="platform-header-user">

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
              <small>
                <i /> Sesión activa
              </small>

              <b>
                {
                  store.profile
                    .fullName
                }
              </b>
            </div>

          </div>

          <span className="platform-role">
            <ShieldCheck
              size={14}
            />
            Super administración
          </span>

          <button
            className="platform-signout"
            onClick={() =>
              void store.signOut()
            }
          >
            <LogOut size={16} />
            <span>
              Cerrar sesión
            </span>
          </button>

        </div>

      </header>

      <div className="platform-admin-shell">

        {/* MENU */}

        <aside className="platform-admin-nav">

          <div>
            <p>
              ADMINISTRACIÓN
            </p>

            <button
              className={
                platformModule ===
                "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPlatformModule(
                  "overview",
                )
              }
            >
              <LayoutDashboard />

              <span>
                Resumen
              </span>
            </button>

            <button
              className={
                platformModule ===
                "businesses"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPlatformModule(
                  "businesses",
                )
              }
            >
              <Building2 />

              <span>
                Negocios
              </span>

              <em>
                {
                  store
                    .platformBusinesses
                    .length
                }
              </em>
            </button>

            <button
              className={
                platformModule ===
                "finances"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPlatformModule(
                  "finances",
                )
              }
            >
              <CircleDollarSign />

              <span>
                Finanzas
              </span>
            </button>

          </div>

          <article>
            <b>
              Panel modular
            </b>

            <p>
              Preparado para agregar
              nuevos módulos sin
              saturar la operación
              principal.
            </p>
          </article>

        </aside>

        {/* CONTENIDO */}

        <section className="platform-dashboard-content">

          <div className="platform-welcome">
            <div>
              <p className="eyebrow">
                CONTROL GLOBAL DE
                SYNTRA PARKFLOW
              </p>
            </div>
          </div>

          {/* RESUMEN */}

          {platformModule ===
            "overview" && (
            <>
              <section className="platform-overview">

                <article>
                  <span>
                    <Building2 />
                  </span>

                  <div>
                    <small>
                      Empresas
                      registradas
                    </small>

                    <b>
                      {
                        store
                          .platformBusinesses
                          .length
                      }
                    </b>

                    <p>
                      {
                        activeBusinesses
                      }{" "}
                      activas
                    </p>
                  </div>
                </article>

                <article>
                  <span>
                    <CircleDollarSign />
                  </span>

                  <div>
                    <small>
                      Planes
                      contratados
                    </small>

                    <b>
                      {paidPlans}
                    </b>

                    <p>
                      {store
                        .platformBusinesses
                        .length -
                        paidPlans}{" "}
                      en demostración
                    </p>
                  </div>
                </article>

                <article>
                  <span>
                    <ParkingCircle />
                  </span>

                  <div>
                    <small>
                      Sucursales
                      operativas
                    </small>

                    <b>
                      {
                        store
                          .platformLots
                          .length
                      }
                    </b>

                    <p>
                      En toda la
                      plataforma
                    </p>
                  </div>
                </article>

                <article>
                  <span>
                    <Users />
                  </span>

                  <div>
                    <small>
                      Usuarios
                      registrados
                    </small>

                    <b>
                      {
                        store.staff
                          .length
                      }
                    </b>

                    <p>
                      Propietarios y
                      colaboradores
                    </p>
                  </div>
                </article>

              </section>

              <section className="platform-module-launchers">

                <button
                  onClick={() =>
                    setPlatformModule(
                      "businesses",
                    )
                  }
                >
                  <span>
                    <Building2 />
                  </span>

                  <div>
                    <b>
                      Administrar
                      negocios
                    </b>

                    <small>
                      Planes,
                      propietarios,
                      sucursales y
                      acceso
                    </small>
                  </div>

                  <ChevronRight />
                </button>

                <button
                  onClick={() =>
                    setPlatformModule(
                      "finances",
                    )
                  }
                >
                  <span>
                    <CircleDollarSign />
                  </span>

                  <div>
                    <b>
                      Consultar
                      finanzas
                    </b>

                    <small>
                      {
                        store
                          .platformSubscriptionPayments
                          .length
                      }{" "}
                      pagos registrados
                    </small>
                  </div>

                  <ChevronRight />
                </button>

              </section>
            </>
          )}

          {/* NEGOCIOS */}

          {platformModule ===
            "businesses" && (
            <section className="platform-directory">

              <header>

                <div>
                  <p className="eyebrow">
                    DIRECTORIO DE
                    CLIENTES
                  </p>

                  <h2>
                    Empresas de la
                    plataforma
                  </h2>
                </div>

                <label>
                  <Search
                    size={17}
                  />

                  <input
                    value={query}
                    onChange={(e) =>
                      setQuery(
                        e.target
                          .value,
                      )
                    }
                    placeholder="Buscar empresa o propietario…"
                  />
                </label>

              </header>

              <div className="platform-business-grid">

                {businesses.map(
                  (business) => {
                    const lots =
                      store.platformLots.filter(
                        (lot) =>
                          lot.businessId ===
                          business.id,
                      );

                    const members =
                      store.staff.filter(
                        (user) =>
                          user.lotIds.some(
                            (id) =>
                              lots.some(
                                (lot) =>
                                  lot.id ===
                                  id,
                              ),
                          ),
                      );

                    const expired =
                      Boolean(
                        business.planExpiresAt &&
                          new Date(
                            business.planExpiresAt,
                          ).getTime() <
                            Date.now(),
                      );

                    return (
                      <article
                        key={
                          business.id
                        }
                      >
                        <div className="platform-business-icon">
                          {business.name
                            .split(" ")
                            .map(
                              (value) =>
                                value[0],
                            )
                            .join("")
                            .slice(
                              0,
                              2,
                            )}
                        </div>

                        <div className="platform-business-copy">

                          <small>
                            {
                              business.slug
                            }
                          </small>

                          <h3>
                            {
                              business.name
                            }
                          </h3>

                        </div>

                        <div className="platform-business-status">

                          <em
                            className={
                              business.active
                                ? "active"
                                : "inactive"
                            }
                          >
                            <i />

                            {business.active
                              ? "Activa"
                              : "Suspendida"}
                          </em>

                          <span
                            className={
                              business.planType
                            }
                          >
                            {business.planType ===
                            "annual"
                              ? "Plan anual"
                              : business.planType ===
                                  "monthly"
                                ? "Plan mensual"
                                : "Demostración"}
                          </span>

                        </div>

                        <div className="platform-business-details">

                          <span>
                            <i>
                              <Users
                                size={
                                  15
                                }
                              />
                            </i>

                            <b>
                              Propietario

                              <small>
                                {
                                  business.ownerName
                                }
                              </small>
                            </b>
                          </span>

                          <span>
                            <i>
                              <CircleDollarSign
                                size={
                                  15
                                }
                              />
                            </i>

                            <b>
                              Plan actual

                              <small
                                className={
                                  expired
                                    ? "expired"
                                    : ""
                                }
                              >
                                {planLabel(
                                  business.planType,
                                )}{" "}
                                ·{" "}
                                {planStatus(
                                  business.planExpiresAt,
                                )}

                                {business.planType !==
                                "demo"
                                  ? ` · ${currency.format(
                                      business.planPrice ??
                                        0,
                                    )}`
                                  : ""}
                              </small>
                            </b>
                          </span>

                          <span>
                            <i>
                              <ParkingCircle
                                size={
                                  15
                                }
                              />
                            </i>

                            <b>
                              Sucursales

                              <small>
                                {
                                  lots.length
                                }{" "}
                                de{" "}
                                {
                                  business.maxLots
                                }{" "}
                                autorizadas ·{" "}
                                {
                                  members.length
                                }{" "}
                                usuarios
                              </small>
                            </b>
                          </span>

                        </div>

                        <div className="platform-card-actions">

                          <button
                            className="secondary"
                            onClick={() =>
                              openDetail(
                                business,
                              )
                            }
                          >
                            <Settings2
                              size={15}
                            />

                            Configurar
                          </button>

                          <button
                            className="primary"
                            disabled={
                              opening ===
                                business.id ||
                              !business.active
                            }
                            onClick={() =>
                              void openBusiness(
                                business.id,
                              )
                            }
                          >
                            {opening ===
                            business.id
                              ? "Cargando…"
                              : "Acceder a la empresa"}

                            <ChevronRight
                              size={16}
                            />
                          </button>

                        </div>

                      </article>
                    );
                  },
                )}

                {!businesses.length && (
                  <div className="platform-no-results">

                    <Building2 />

                    <b>
                      No encontramos
                      empresas
                    </b>

                    <p>
                      Prueba con otro
                      nombre,
                      propietario o
                      identificador.
                    </p>

                  </div>
                )}

              </div>

            </section>
          )}

          {/* FINANZAS */}

          {platformModule ===
            "finances" && (
            <section className="platform-finances">

              <div className="platform-finance-stats">

                <article>
                  <small>
                    Ingresos del
                    periodo
                  </small>

                  <b>
                    {currency.format(
                      financeTotal,
                    )}
                  </b>

                  <p>
                    {
                      financeRows.length
                    }{" "}
                    pagos confirmados
                  </p>
                </article>

                <article>
                  <small>
                    Planes mensuales
                  </small>

                  <b>
                    {currency.format(
                      monthlyIncome,
                    )}
                  </b>

                  <p>
                    {
                      financeRows.filter(
                        (payment) =>
                          payment.planType ===
                          "monthly",
                      ).length
                    }{" "}
                    movimientos
                  </p>
                </article>

                <article>
                  <small>
                    Planes anuales
                  </small>

                  <b>
                    {currency.format(
                      annualIncome,
                    )}
                  </b>

                  <p>
                    {
                      financeRows.filter(
                        (payment) =>
                          payment.planType ===
                          "annual",
                      ).length
                    }{" "}
                    movimientos
                  </p>
                </article>

              </div>

              <div className="platform-finance-table">

                <header>

                  <div>
                    <p className="eyebrow">
                      CONTROL DE
                      INGRESOS
                    </p>

                    <h2>
                      Pagos de
                      suscripciones
                    </h2>
                  </div>

                  <div className="platform-finance-actions">

                    <div className="cut-presets">

                      {[
                        [
                          "30",
                          "30 días",
                        ],
                        [
                          "90",
                          "90 días",
                        ],
                        [
                          "year",
                          "Este año",
                        ],
                        [
                          "all",
                          "Todo",
                        ],
                      ].map(
                        ([
                          value,
                          label,
                        ]) => (
                          <button
                            key={
                              value
                            }
                            className={
                              financePeriod ===
                              value
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setFinancePeriod(
                                value as typeof financePeriod,
                              )
                            }
                          >
                            {label}
                          </button>
                        ),
                      )}

                    </div>

                    <label>
                      <Search />

                      <input
                        value={
                          financeQuery
                        }
                        onChange={(
                          event,
                        ) =>
                          setFinanceQuery(
                            event.target
                              .value,
                          )
                        }
                        placeholder="Empresa, propietario o referencia"
                      />
                    </label>

                    <button
                      className="secondary"
                      disabled={
                        !financeRows.length
                      }
                      onClick={
                        exportPlatformPayments
                      }
                    >
                      ↓ Exportar CSV
                    </button>

                  </div>

                </header>

                <div className="platform-finance-scroll">

                  <table>

                    <thead>
                      <tr>
                        <th>
                          Fecha
                        </th>

                        <th>
                          Empresa
                        </th>

                        <th>
                          Plan
                        </th>

                        <th>
                          Periodo
                          cubierto
                        </th>

                        <th>
                          Método /
                          referencia
                        </th>

                        <th>
                          Importe
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {financeRows.map(
                        (
                          payment,
                        ) => {
                          const business =
                            store.platformBusinesses.find(
                              (
                                item,
                              ) =>
                                item.id ===
                                payment.businessId,
                            );

                          return (
                            <tr
                              key={
                                payment.id
                              }
                            >
                              <td>
                                <b>
                                  {new Date(
                                    payment.paidAt,
                                  ).toLocaleDateString(
                                    "es-MX",
                                  )}
                                </b>

                                <small>
                                  {clock.format(
                                    new Date(
                                      payment.paidAt,
                                    ),
                                  )}
                                </small>
                              </td>

                              <td>
                                <b>
                                  {business?.name ??
                                    "Empresa eliminada"}
                                </b>

                                <small>
                                  {business?.ownerName ??
                                    "Sin propietario"}
                                </small>
                              </td>

                              <td>
                                <span
                                  className={`finance-plan ${payment.planType}`}
                                >
                                  {payment.planType ===
                                  "annual"
                                    ? "Anual"
                                    : "Mensual"}
                                </span>
                              </td>

                              <td>
                                <b>
                                  {new Date(
                                    `${payment.periodStart}T12:00:00`,
                                  ).toLocaleDateString(
                                    "es-MX",
                                  )}{" "}
                                  —{" "}
                                  {new Date(
                                    `${payment.periodEnd}T12:00:00`,
                                  ).toLocaleDateString(
                                    "es-MX",
                                  )}
                                </b>

                                <small>
                                  {payment.notes ||
                                    "Sin observaciones"}
                                </small>
                              </td>

                              <td>
                                <b>
                                  {
                                    payment.paymentMethod
                                  }
                                </b>

                                <small>
                                  {payment.reference ||
                                    "Sin referencia"}
                                </small>
                              </td>

                              <td className="amount">
                                {currency.format(
                                  payment.amount,
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}

                    </tbody>

                  </table>

                  {!financeRows.length && (
                    <div className="platform-finance-empty">

                      <CircleDollarSign />

                      <b>
                        No hay pagos en
                        este periodo
                      </b>

                      <p>
                        Cambia el filtro
                        o registra pagos
                        desde el detalle
                        de cada negocio.
                      </p>

                    </div>
                  )}

                </div>

              </div>

            </section>
          )}

        </section>

      </div>

      {/* =====================================================
          MODAL EMPRESA
      ===================================================== */}

      {selected && (
        <div
          className="backdrop platform-company-backdrop"
          onMouseDown={
            closeDetail
          }
        >
          <section
            className={`platform-company-modal ${dialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-company-title"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close"
              onClick={
                closeDetail
              }
              aria-label="Cerrar"
            >
              ×
            </button>

            {/* DETALLE */}

            {dialog ===
              "detail" && (
              <>

                <header className="platform-company-heading">

                  <div className="platform-company-mark">
                    {selected.name
                      .split(" ")
                      .map(
                        (value) =>
                          value[0],
                      )
                      .join("")
                      .slice(
                        0,
                        2,
                      )}
                  </div>

                  <div>
                    <p className="eyebrow">
                      DETALLE DE LA
                      EMPRESA
                    </p>

                    <h2 id="platform-company-title">
                      {
                        selected.name
                      }
                    </h2>

                    <div className="company-contract-state">

                      <span
                        className={
                          selected.active
                            ? "company-live"
                            : "company-paused"
                        }
                      >
                        <i />

                        {selected.active
                          ? "Operando"
                          : "Acceso suspendido"}
                      </span>

                      <strong
                        className={
                          selected.planType
                        }
                      >
                        {planLabel(
                          selected.planType,
                        )}
                      </strong>

                      <small>
                        {selected.planType ===
                        "demo"
                          ? "Sin contratación"
                          : `${currency.format(
                              selected.planPrice ??
                                0,
                            )} ${
                              selected.planType ===
                              "annual"
                                ? "al año"
                                : "al mes"
                            }`}
                      </small>

                    </div>
                  </div>

                </header>

                <div className="platform-company-body">

                  <section className="platform-company-information">

                    <h3>
                      Datos del
                      negocio
                    </h3>

                    <dl>

                      <div>
                        <dt>
                          Identificador
                        </dt>

                        <dd>
                          {
                            selected.slug
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Propietario
                        </dt>

                        <dd>
                          {
                            selected.ownerName
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Sucursales
                        </dt>

                        <dd>
                          {
                            store.platformLots.filter(
                              (
                                lot,
                              ) =>
                                lot.businessId ===
                                selected.id,
                            ).length
                          }{" "}
                          activas de{" "}
                          {
                            selected.maxLots
                          }{" "}
                          autorizadas
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Estado de
                          acceso
                        </dt>

                        <dd>
                          {selected.active
                            ? "Todos los usuarios pueden ingresar"
                            : selected.suspensionReason ||
                              "Acceso bloqueado"}
                        </dd>
                      </div>

                    </dl>

                  </section>

                  {/* PLAN */}

                  <form
                    className="platform-plan-form"
                    onSubmit={
                      savePlan
                    }
                  >
                    <div className="platform-plan-title">

                      <span>
                        <CreditCard
                          size={
                            20
                          }
                        />
                      </span>

                      <div>
                        <h3>
                          Plan y
                          vigencia
                        </h3>

                        <p>
                          {planLabel(
                            selected.planType,
                          )}{" "}
                          ·{" "}
                          {planStatus(
                            selected.planExpiresAt,
                          )}
                        </p>
                      </div>

                    </div>

                    <label>
                      Plan asignado

                      <select
                        value={
                          planType
                        }
                        onChange={(
                          e,
                        ) => {
                          const value =
                            e.target
                              .value as typeof planType;

                          setPlanType(
                            value,
                          );

                          setDurationDays(
                            value ===
                            "annual"
                              ? 365
                              : value ===
                                  "monthly"
                                ? 30
                                : 15,
                          );
                        }}
                      >
                        <option value="demo">
                          Demostración
                        </option>

                        <option value="monthly">
                          Mensual
                        </option>

                        <option value="annual">
                          Anual
                        </option>
                      </select>
                    </label>

                    <div className="platform-plan-grid">

                      <label>
                        Costo
                        contratado
                        (MXN)

                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={
                            planPrice
                          }
                          onChange={(
                            e,
                          ) =>
                            setPlanPrice(
                              Number(
                                e
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </label>

                      <label>
                        Vigencia en
                        días

                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={
                            durationDays
                          }
                          onChange={(
                            e,
                          ) =>
                            setDurationDays(
                              Number(
                                e
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </label>

                      <label>
                        Sucursales
                        autorizadas

                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={
                            maxLots
                          }
                          onChange={(
                            e,
                          ) =>
                            setMaxLots(
                              Number(
                                e
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </label>

                    </div>

                    <small>
                      El costo representa
                      el importe mensual
                      o anual acordado.
                      La vigencia se
                      contará desde que
                      guardes.
                    </small>

                    <button
                      className="primary"
                      disabled={
                        saving
                      }
                    >
                      {saving
                        ? "Guardando…"
                        : "Confirmar y actualizar plan"}
                    </button>

                  </form>

                  {/* HISTORIAL */}

                  <section className="platform-payment-history">

                    <header>

                      <div>
                        <p className="eyebrow">
                          HISTORIAL
                          COMERCIAL
                        </p>

                        <h3>
                          Pagos de la
                          suscripción
                        </h3>
                      </div>

                      <button
                        disabled={
                          selected.planType ===
                          "demo"
                        }
                        onClick={() => {
                          setPaymentAmount(
                            selected.planPrice ??
                              0,
                          );

                          setDialog(
                            "payment",
                          );

                          setFormError(
                            "",
                          );
                        }}
                      >
                        <Plus
                          size={
                            15
                          }
                        />
                        Registrar pago
                      </button>

                    </header>

                    <div>

                      {store.platformSubscriptionPayments
                        .filter(
                          (
                            payment,
                          ) =>
                            payment.businessId ===
                            selected.id,
                        )
                        .slice(
                          0,
                          8,
                        )
                        .map(
                          (
                            payment,
                          ) => (
                            <article
                              key={
                                payment.id
                              }
                            >
                              <span>
                                <CreditCard
                                  size={
                                    16
                                  }
                                />
                              </span>

                              <div>
                                <b>
                                  {currency.format(
                                    payment.amount,
                                  )}
                                </b>

                                <small>
                                  {new Date(
                                    payment.paidAt,
                                  ).toLocaleDateString(
                                    "es-MX",
                                  )}{" "}
                                  ·{" "}
                                  {
                                    payment.paymentMethod
                                  }
                                </small>
                              </div>

                              <p>
                                <b>
                                  {payment.planType ===
                                  "annual"
                                    ? "Anual"
                                    : "Mensual"}
                                </b>

                                <small>
                                  {
                                    payment.periodStart
                                  }{" "}
                                  —{" "}
                                  {
                                    payment.periodEnd
                                  }
                                </small>
                              </p>

                              <em>
                                {payment.reference ||
                                  "Sin referencia"}
                              </em>
                            </article>
                          ),
                        )}

                      {!store.platformSubscriptionPayments.some(
                        (
                          payment,
                        ) =>
                          payment.businessId ===
                          selected.id,
                      ) && (
                        <p className="platform-empty-payments">
                          Aún no hay
                          pagos
                          registrados
                          para esta
                          empresa.
                        </p>
                      )}

                    </div>

                  </section>

                </div>

                {formError && (
                  <p className="platform-form-error">
                    {formError}
                  </p>
                )}

                <footer className="platform-company-actions">

                  <button
                    className="danger-link"
                    onClick={() => {
                      setDialog(
                        "delete",
                      );

                      setFormError(
                        "",
                      );
                    }}
                  >
                    <Trash2
                      size={16}
                    />
                    Eliminar
                  </button>

                  {selected.active ? (
                    <button
                      className="warning"
                      onClick={() => {
                        setDialog(
                          "suspend",
                        );

                        setFormError(
                          "",
                        );
                      }}
                    >
                      <AlertTriangle
                        size={
                          16
                        }
                      />
                      Suspender acceso
                    </button>
                  ) : (
                    <button
                      className="reactivate"
                      onClick={() => {
                        setDialog(
                          "reactivate",
                        );

                        setFormError(
                          "",
                        );
                      }}
                    >
                      <RotateCcw
                        size={
                          16
                        }
                      />
                      Reactivar empresa
                    </button>
                  )}

                  <button
                    className="primary"
                    disabled={
                      !selected.active ||
                      opening ===
                        selected.id
                    }
                    onClick={() =>
                      void openBusiness(
                        selected.id,
                      )
                    }
                  >
                    Entrar al negocio
                    <ChevronRight
                      size={16}
                    />
                  </button>

                </footer>

              </>
            )}

            {/* PAGO */}

            {dialog ===
              "payment" && (
              <form
                className="platform-confirm-form platform-payment-form"
                onSubmit={
                  recordPayment
                }
              >
                <span className="platform-success-icon">
                  <CreditCard />
                </span>

                <p className="eyebrow">
                  SUSCRIPCIÓN
                </p>

                <h2 id="platform-company-title">
                  Registrar pago
                </h2>

                <p>
                  Captura el pago de{" "}
                  <b>
                    {
                      selected.name
                    }
                  </b>{" "}
                  para conservar el
                  historial y
                  actualizar su
                  vigencia.
                </p>

                <div className="platform-plan-grid">

                  <label>
                    Importe pagado

                    <input
                      type="number"
                      min={
                        0.01
                      }
                      step="0.01"
                      value={
                        paymentAmount
                      }
                      onChange={(
                        e,
                      ) =>
                        setPaymentAmount(
                          Number(
                            e
                              .target
                              .value,
                          ),
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Método

                    <select
                      value={
                        paymentMethod
                      }
                      onChange={(
                        e,
                      ) =>
                        setPaymentMethod(
                          e.target
                            .value,
                        )
                      }
                    >
                      <option value="transfer">
                        Transferencia
                      </option>

                      <option value="cash">
                        Efectivo
                      </option>

                      <option value="card">
                        Tarjeta
                      </option>

                      <option value="deposit">
                        Depósito
                      </option>
                    </select>
                  </label>

                  <label>
                    Inicio del periodo

                    <input
                      type="date"
                      value={
                        periodStart
                      }
                      onChange={(
                        e,
                      ) =>
                        setPeriodStart(
                          e.target
                            .value,
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Fin del periodo

                    <input
                      type="date"
                      value={
                        periodEnd
                      }
                      min={
                        periodStart
                      }
                      onChange={(
                        e,
                      ) =>
                        setPeriodEnd(
                          e.target
                            .value,
                        )
                      }
                      required
                    />
                  </label>

                </div>

                <label>
                  Referencia

                  <input
                    value={
                      paymentReference
                    }
                    onChange={(e) =>
                      setPaymentReference(
                        e.target
                          .value,
                      )
                    }
                    placeholder="Folio, transferencia o recibo"
                  />
                </label>

                <label>
                  Notas

                  <textarea
                    value={
                      paymentNotes
                    }
                    onChange={(e) =>
                      setPaymentNotes(
                        e.target
                          .value,
                      )
                    }
                    placeholder="Observaciones opcionales"
                  />
                </label>

                {formError && (
                  <p className="platform-form-error">
                    {formError}
                  </p>
                )}

                <footer>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setDialog(
                        "detail",
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="reactivate"
                    disabled={
                      saving ||
                      paymentAmount <=
                        0 ||
                      periodEnd <
                        periodStart
                    }
                  >
                    {saving
                      ? "Registrando…"
                      : "Confirmar pago"}
                  </button>

                </footer>

              </form>
            )}

            {/* SUSPENDER */}

            {dialog ===
              "suspend" && (
              <form
                className="platform-confirm-form"
                onSubmit={
                  suspendBusiness
                }
              >
                <span className="platform-warning-icon">
                  <AlertTriangle />
                </span>

                <p className="eyebrow">
                  CONTROL DE ACCESO
                </p>

                <h2 id="platform-company-title">
                  Suspender empresa
                </h2>

                <p>
                  Se bloqueará
                  inmediatamente el
                  acceso de todos los
                  usuarios de{" "}
                  <b>
                    {
                      selected.name
                    }
                  </b>
                  , sin eliminar su
                  información.
                </p>

                <fieldset>
                  <legend>
                    Tipo de suspensión
                  </legend>

                  <div className="platform-choice">

                    <label
                      className={
                        suspensionType ===
                        "temporary"
                          ? "active"
                          : ""
                      }
                    >
                      <input
                        type="radio"
                        name="suspension"
                        value="temporary"
                        checked={
                          suspensionType ===
                          "temporary"
                        }
                        onChange={() =>
                          setSuspensionType(
                            "temporary",
                          )
                        }
                      />

                      <b>
                        Temporal
                      </b>

                      <small>
                        Podrás reactivar
                        la empresa
                        después.
                      </small>
                    </label>

                    <label
                      className={
                        suspensionType ===
                        "permanent"
                          ? "active"
                          : ""
                      }
                    >
                      <input
                        type="radio"
                        name="suspension"
                        value="permanent"
                        checked={
                          suspensionType ===
                          "permanent"
                        }
                        onChange={() =>
                          setSuspensionType(
                            "permanent",
                          )
                        }
                      />

                      <b>
                        Permanente
                      </b>

                      <small>
                        Conserva los
                        datos, pero
                        bloquea el
                        acceso.
                      </small>
                    </label>

                  </div>
                </fieldset>

                <label>
                  Motivo

                  <textarea
                    value={reason}
                    onChange={(e) =>
                      setReason(
                        e.target
                          .value,
                      )
                    }
                    placeholder="Ej. Pago pendiente del servicio"
                    required
                    minLength={5}
                  />
                </label>

                {formError && (
                  <p className="platform-form-error">
                    {formError}
                  </p>
                )}

                <footer>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setDialog(
                        "detail",
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="danger"
                    disabled={
                      saving ||
                      reason
                        .trim()
                        .length <
                        5
                    }
                  >
                    {saving
                      ? "Suspendiendo…"
                      : "Confirmar suspensión"}
                  </button>

                </footer>

              </form>
            )}

            {/* REACTIVAR */}

            {dialog ===
              "reactivate" && (
              <div className="platform-confirm-form">

                <span className="platform-success-icon">
                  <RotateCcw />
                </span>

                <p className="eyebrow">
                  REACTIVAR ACCESO
                </p>

                <h2 id="platform-company-title">
                  Reactivar{" "}
                  {selected.name}
                </h2>

                <p>
                  Los usuarios de esta
                  empresa podrán
                  volver a iniciar
                  sesión y consultar
                  sus módulos
                  asignados.
                </p>

                <div className="platform-confirm-note">

                  <CheckCircle2 />

                  <span>
                    <b>
                      La información se
                      conserva
                    </b>

                    <small>
                      La operación
                      continuará con el
                      plan y vigencia
                      actuales.
                    </small>
                  </span>

                </div>

                {formError && (
                  <p className="platform-form-error">
                    {formError}
                  </p>
                )}

                <footer>

                  <button
                    className="secondary"
                    onClick={() =>
                      setDialog(
                        "detail",
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="reactivate"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void reactivateBusiness()
                    }
                  >
                    {saving
                      ? "Reactivando…"
                      : "Confirmar reactivación"}
                  </button>

                </footer>

              </div>
            )}

            {/* ELIMINAR */}

            {dialog ===
              "delete" && (
              <form
                className="platform-confirm-form delete"
                onSubmit={
                  removeBusiness
                }
              >
                <span className="platform-danger-icon">
                  <Trash2 />
                </span>

                <p className="eyebrow">
                  ACCIÓN IRREVERSIBLE
                </p>

                <h2 id="platform-company-title">
                  Eliminar empresa
                </h2>

                <p>
                  Se eliminarán de
                  ParkFlow las
                  sucursales,
                  vehículos,
                  estancias, cobros,
                  cajas, turnos,
                  tarifas y
                  membresías de{" "}
                  <b>
                    {
                      selected.name
                    }
                  </b>
                  . Las identidades de
                  acceso compartidas no
                  se borrarán.
                </p>

                <div className="platform-delete-warning">

                  <AlertTriangle />

                  <span>
                    <b>
                      Esta acción no se
                      puede deshacer
                    </b>

                    <small>
                      Escribe el nombre
                      exacto de la
                      empresa para
                      confirmar.
                    </small>
                  </span>

                </div>

                <label>
                  Escribe “
                  {selected.name}”

                  <input
                    value={
                      confirmation
                    }
                    onChange={(e) =>
                      setConfirmation(
                        e.target
                          .value,
                      )
                    }
                    autoComplete="off"
                    placeholder={
                      selected.name
                    }
                  />
                </label>

                {formError && (
                  <p className="platform-form-error">
                    {formError}
                  </p>
                )}

                <footer>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setDialog(
                        "detail",
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="danger"
                    disabled={
                      saving ||
                      confirmation !==
                        selected.name
                    }
                  >
                    {saving
                      ? "Eliminando…"
                      : "Eliminar definitivamente"}
                  </button>

                </footer>

              </form>
            )}

          </section>
        </div>
      )}

    </main>
  );
}