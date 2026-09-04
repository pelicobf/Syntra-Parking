"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Barcode,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  ParkingCircle,
  Plus,
  Printer,
  ScanLine,
  Settings2,
  WalletCards,
} from "lucide-react";

import { ModalHeader } from "@/app/components/common/ModalHeader";
import { UnitTypeIcon } from "@/app/components/settings/UnitTypeIcon";

import { useParkingStore } from "@/app/hooks/use-parking-store";

import { currency } from "@/app/lib/formatters";

type Props = {
  store: ReturnType<
    typeof useParkingStore
  >;

  notify: (
    value: string,
  ) => void;

  navigationMode:
    | "sidebar"
    | "mosaic";

  onNavigationModeChange: (
    mode:
      | "sidebar"
      | "mosaic",
  ) => void;
};

export function Settings({
  store,
  notify,
  navigationMode,
  onNavigationModeChange,
}: Props) {
  const [
    section,
    setSection,
  ] = useState<
    | "appearance"
    | "rates"
    | "types"
    | "manuals"
  >("appearance");

  const [
    drafts,
    setDrafts,
  ] = useState(store.rates);

  const [
    savingId,
    setSavingId,
  ] = useState("");

  const [
    adding,
    setAdding,
  ] = useState(false);

  const [
    manual,
    setManual,
  ] = useState<
    string | null
  >(null);

  const [
    expandedRateId,
    setExpandedRateId,
  ] = useState<
    string | null
  >(null);

  const canManageRates =
    [
      "owner",
      "super_admin",
    ].includes(
      store.profile.role,
    ) ||
    store.profile.permissionCodes.includes(
      "rates.manage",
    );

  /* =========================================================
     NUEVO TIPO DE UNIDAD
  ========================================================= */

  const [
    typeName,
    setTypeName,
  ] = useState("");

  const [
    typeDescription,
    setTypeDescription,
  ] = useState("");

  const [
    typePrice,
    setTypePrice,
  ] = useState(0);

  const [
    typeFraction,
    setTypeFraction,
  ] = useState<
    15 | 30 | 45 | 60
  >(15);

  /* =========================================================
     SINCRONIZAR TARIFAS
  ========================================================= */

  useEffect(() => {
    setDrafts(
      store.rates,
    );
  }, [store.rates]);

  const lotRates =
    drafts.filter(
      (rate) =>
        rate.lotId ===
        store.lotId,
    );

  /* =========================================================
     EDITAR TARIFA
  ========================================================= */

  function updateRate(
    id: string,
    changes: Partial<
      (typeof drafts)[number]
    >,
  ) {
    setDrafts(
      (current) =>
        current.map(
          (rate) =>
            rate.id === id
              ? {
                  ...rate,
                  ...changes,
                }
              : rate,
        ),
    );
  }

  function closeRateEditor() {
    if (savingId) {
      return;
    }

    setDrafts(
      store.rates,
    );

    setExpandedRateId(
      null,
    );
  }

  async function save(
    rate: (typeof drafts)[number],
  ) {
    setSavingId(
      rate.id,
    );

    try {
      await store.saveRate(
        rate,
      );

      setExpandedRateId(
        null,
      );

      notify(
        "Tarifa actualizada correctamente",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la tarifa",
      );
    } finally {
      setSavingId("");
    }
  }

  /* =========================================================
     CREAR TIPO DE UNIDAD
  ========================================================= */

  async function addType(
    e: FormEvent,
  ) {
    e.preventDefault();

    setSavingId("new");

    try {
      await store.createVehicleType(
        {
          name: typeName,

          description:
            typeDescription,

          price: typePrice,

          fractionMinutes:
            typeFraction,
        },
      );

      setAdding(false);

      setTypeName("");
      setTypeDescription("");
      setTypePrice(0);

      notify(
        "Tipo de unidad y tarifa creados",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible crear el tipo de unidad",
      );
    } finally {
      setSavingId("");
    }
  }

  /* =========================================================
     MANUALES
  ========================================================= */

  const manuals = [
    {
      id: "printer",
      icon: Printer,
      title:
        "Impresora térmica",
      text:
        "Instalación, papel, conexión USB o red e impresión de prueba.",

      steps: [
        "Conecta la impresora y coloca papel térmico de 80 mm.",
        "Instala el controlador indicado por el fabricante.",
        "Selecciona la impresora predeterminada y realiza una impresión de prueba.",
      ],
    },

    {
      id: "scanner",
      icon: Barcode,
      title:
        "Pistola lectora",
      text:
        "Configura lectores USB para QR y códigos de barras.",

      steps: [
        "Conecta el lector en modo teclado USB HID.",
        "Configura el sufijo ENTER después de cada lectura.",
        "Abre Entradas y salidas y escanea un boleto de prueba.",
      ],
    },

    {
      id: "camera",
      icon: ScanLine,
      title:
        "Cámara del celular",
      text:
        "Permisos y recomendaciones para escaneo móvil.",

      steps: [
        "Abre ParkFlow desde HTTPS en Chrome o Safari.",
        "Autoriza el acceso a la cámara trasera.",
        "Mantén el código iluminado y dentro del marco.",
      ],
    },

    {
      id: "drawer",
      icon: WalletCards,
      title:
        "Cajón de dinero",
      text:
        "Conexión mediante impresora y apertura automática.",

      steps: [
        "Conecta el cajón al puerto RJ11/RJ12 de la impresora.",
        "Activa la apertura al finalizar la impresión.",
        "Realiza un cobro de prueba antes de operar.",
      ],
    },
  ];

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="screen settings-screen">

      {/* ================================================
          MENU CONFIGURACIÓN
      ================================================= */}

      <nav className="settings-sections">

        <button
          className={
            section ===
            "appearance"
              ? "active"
              : ""
          }
          onClick={() =>
            setSection(
              "appearance",
            )
          }
        >
          <LayoutDashboard />

          Navegación
        </button>

        <button
          className={
            section === "rates"
              ? "active"
              : ""
          }
          onClick={() =>
            setSection("rates")
          }
        >
          <CircleDollarSign />

          Tarifas por unidad
        </button>

        <button
          className={
            section === "types"
              ? "active"
              : ""
          }
          onClick={() =>
            setSection("types")
          }
        >
          <ParkingCircle />

          Tipos de unidad
        </button>

        <button
          className={
            section ===
            "manuals"
              ? "active"
              : ""
          }
          onClick={() =>
            setSection(
              "manuals",
            )
          }
        >
          <BookOpen />

          Manuales y
          dispositivos
        </button>

      </nav>

      {/* =====================================================
          NAVEGACIÓN
      ====================================================== */}

      {section ===
        "appearance" && (
        <>
          <div className="settings-section-head">

            <div>
              <p className="eyebrow">
                EXPERIENCIA DE
                NAVEGACIÓN
              </p>

              <h2>
                Elige cómo quieres
                trabajar
              </h2>

              <p>
                La preferencia se
                guarda únicamente en
                este dispositivo.
              </p>
            </div>

          </div>

          <div className="navigation-mode-grid">

            {/* SIDEBAR */}

            <button
              className={
                navigationMode ===
                "sidebar"
                  ? "active"
                  : ""
              }
              onClick={() =>
                onNavigationModeChange(
                  "sidebar",
                )
              }
            >
              <span>
                <Settings2 />

                <i />
                <i />
                <i />
              </span>

              <div>
                <b>
                  Menú lateral
                </b>

                <small>
                  Dashboard
                  tradicional con
                  acceso permanente
                  a los módulos.
                </small>
              </div>

              <em>
                {navigationMode ===
                "sidebar"
                  ? "✓ Seleccionado"
                  : "Seleccionar"}
              </em>
            </button>

            {/* MOSAICO */}

            <button
              className={
                navigationMode ===
                "mosaic"
                  ? "active"
                  : ""
              }
              onClick={() =>
                onNavigationModeChange(
                  "mosaic",
                )
              }
            >
              <span>
                <LayoutDashboard />

                <i />
                <i />
                <i />
                <i />
              </span>

              <div>
                <b>
                  Inicio en mosaico
                </b>

                <small>
                  Experiencia visual
                  inspirada en
                  Syntra POS.
                </small>
              </div>

              <em>
                {navigationMode ===
                "mosaic"
                  ? "✓ Seleccionado"
                  : "Seleccionar"}
              </em>
            </button>

          </div>
        </>
      )}

      {/* =====================================================
          TARIFAS
      ====================================================== */}

      {section ===
        "rates" && (
        <>
          <div className="settings-section-head">

            <div>
              <p className="eyebrow">
                REGLAS DE COBRO
              </p>

              <h2>
                Tarifas por tipo de
                unidad
              </h2>

              <p>
                {canManageRates
                  ? "Consulta y edita las tarifas sin salir de esta pantalla."
                  : "Consulta las tarifas configuradas para la sucursal."}
              </p>
            </div>

          </div>

          <div className="pricing-help">

            <CircleDollarSign />

            <div>
              <b>
                Dos modalidades de
                cobro
              </b>

              <p>
                <strong>
                  Por tiempo
                </strong>{" "}
                acumula fracciones.{" "}
                <strong>
                  Tiempo libre
                </strong>{" "}
                cobra una cantidad
                fija sin importar la
                duración.
              </p>
            </div>

          </div>

          <div className="vehicle-rate-grid compact-rates">

            {store.vehicleTypes.map(
              (type) => {
                const rate =
                  lotRates.find(
                    (item) =>
                      item.vehicleTypeId ===
                      type.id,
                  );

                const summary =
                  rate?.pricingMode ===
                  "free_time"
                    ? `${currency.format(
                        rate.flatPrice ??
                          0,
                      )} · tiempo libre`
                    : `${currency.format(
                        rate?.price ??
                          0,
                      )} cada ${
                        rate?.fractionMinutes ??
                        15
                      } min`;

                return (
                  <article
                    className={`card vehicle-rate-card collapsed mode-${
                      rate?.pricingMode ??
                      "missing"
                    }`}
                    key={type.id}
                  >
                    <header>

                      <span>
                        <UnitTypeIcon
                          typeKey={
                            type.key
                          }
                        />
                      </span>

                      <div>
                        <small>
                          TIPO DE
                          UNIDAD
                        </small>

                        <h3>
                          {
                            type.name
                          }
                        </h3>

                        <p>
                          {summary}
                        </p>
                      </div>

                      {rate && (
                        <em>
                          {rate.pricingMode ===
                          "free_time"
                            ? "Tiempo libre"
                            : "Por tiempo"}
                        </em>
                      )}

                      {rate &&
                        canManageRates && (
                          <button
                            className="rate-edit-toggle"
                            onClick={() =>
                              setExpandedRateId(
                                rate.id,
                              )
                            }
                          >
                            Editar

                            <ChevronRight />
                          </button>
                        )}

                    </header>

                    {!rate && (
                      <div className="missing-rate">
                        Ejecuta la
                        migración para
                        crear la tarifa
                        de esta unidad.
                      </div>
                    )}

                  </article>
                );
              },
            )}

          </div>
        </>
      )}

      {/* =====================================================
          TIPOS DE UNIDAD
      ====================================================== */}

      {section ===
        "types" && (
        <>
          <div className="settings-section-head">

            <div>
              <p className="eyebrow">
                CATÁLOGO OPERATIVO
              </p>

              <h2>
                Tipos de unidad
              </h2>

              <p>
                Estas opciones
                estarán disponibles
                al registrar cada
                entrada.
              </p>
            </div>

            {canManageRates && (
              <button
                className="primary"
                onClick={() =>
                  setAdding(true)
                }
              >
                <Plus
                  size={16}
                />

                Nuevo tipo
              </button>
            )}

          </div>

          <div className="unit-type-list">

            {store.vehicleTypes.map(
              (type) => (
                <article
                  className="card"
                  key={type.id}
                >
                  <span>
                    <UnitTypeIcon
                      typeKey={
                        type.key
                      }
                    />
                  </span>

                  <div>
                    <small>
                      {type.key.toUpperCase()}
                    </small>

                    <h3>
                      {type.name}
                    </h3>

                    <p>
                      {type.description ||
                        "Sin descripción"}
                    </p>
                  </div>

                  <em>
                    ● Activo
                  </em>

                </article>
              ),
            )}

          </div>
        </>
      )}

      {/* =====================================================
          MANUALES
      ====================================================== */}

      {section ===
        "manuals" && (
        <>
          <div className="settings-section-head">

            <div>
              <p className="eyebrow">
                CENTRO DE AYUDA
              </p>

              <h2>
                Manuales y
                dispositivos
              </h2>

              <p>
                Esta sección crecerá
                con nuevas guías de
                instalación y
                operación.
              </p>
            </div>

          </div>

          <div className="manual-grid">

            {manuals.map(
              (item) => {
                const Icon =
                  item.icon;

                const open =
                  manual ===
                  item.id;

                return (
                  <article
                    className={`card manual-card ${
                      open
                        ? "open"
                        : ""
                    }`}
                    key={
                      item.id
                    }
                  >
                    <button
                      onClick={() =>
                        setManual(
                          open
                            ? null
                            : item.id,
                        )
                      }
                    >
                      <span>
                        <Icon />
                      </span>

                      <div>
                        <h3>
                          {
                            item.title
                          }
                        </h3>

                        <p>
                          {
                            item.text
                          }
                        </p>
                      </div>

                      <ChevronRight />
                    </button>

                    {open && (
                      <ol>
                        {item.steps.map(
                          (step) => (
                            <li
                              key={
                                step
                              }
                            >
                              {step}
                            </li>
                          ),
                        )}
                      </ol>
                    )}

                  </article>
                );
              },
            )}

          </div>
        </>
      )}

      {/* =====================================================
          MODAL EDITAR TARIFA
      ====================================================== */}

      {expandedRateId &&
        (() => {
          const rate =
            lotRates.find(
              (item) =>
                item.id ===
                expandedRateId,
            );

          const type =
            store.vehicleTypes.find(
              (item) =>
                item.id ===
                rate?.vehicleTypeId,
            );

          if (
            !rate ||
            !type
          ) {
            return null;
          }

          return (
            <div
              className="backdrop"
              onMouseDown={
                closeRateEditor
              }
            >
              <section
                className="modal rate-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rate-modal-title"
                onMouseDown={(e) =>
                  e.stopPropagation()
                }
              >
                <button
                  className="close"
                  onClick={
                    closeRateEditor
                  }
                  aria-label="Cerrar"
                >
                  ×
                </button>

                <ModalHeader
                  overline="EDITAR TARIFA"
                  title={`Tarifa para ${type.name}`}
                  text="Define cómo se calculará el importe de esta unidad."
                />

                <div className="rate-editor">

                  {/* MODO DE COBRO */}

                  <div className="pricing-mode">

                    <button
                      type="button"
                      className={
                        rate.pricingMode ===
                        "fraction"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        updateRate(
                          rate.id,
                          {
                            pricingMode:
                              "fraction",
                          },
                        )
                      }
                    >
                      <Clock3 />

                      Por tiempo
                    </button>

                    <button
                      type="button"
                      className={
                        rate.pricingMode ===
                        "free_time"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        updateRate(
                          rate.id,
                          {
                            pricingMode:
                              "free_time",

                            flatPrice:
                              rate.flatPrice ??
                              rate.price,
                          },
                        )
                      }
                    >
                      <ParkingCircle />

                      Tiempo libre
                    </button>

                  </div>

                  {/* TIEMPO LIBRE */}

                  {rate.pricingMode ===
                  "free_time" ? (
                    <div className="free-time-fields compact">

                      <label>
                        Precio fijo por
                        estancia

                        <div className="input-affix">

                          <span>$</span>

                          <input
                            autoFocus
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              rate.flatPrice ??
                              0
                            }
                            onChange={(
                              e,
                            ) =>
                              updateRate(
                                rate.id,
                                {
                                  flatPrice:
                                    Number(
                                      e
                                        .target
                                        .value,
                                    ),
                                },
                              )
                            }
                          />

                          <span>
                            MXN
                          </span>

                        </div>
                      </label>

                      <div className="free-time-note">

                        <CheckCircle2 />

                        <span>
                          <b>
                            {currency.format(
                              rate.flatPrice ??
                                0,
                            )}{" "}
                            por tiempo
                            libre
                          </b>

                          <small>
                            Mismo importe
                            sin importar
                            la duración.
                          </small>
                        </span>

                      </div>

                    </div>
                  ) : (
                    /* COBRO POR FRACCIÓN */

                    <div className="rate-fields">

                      <label>
                        Precio por
                        fracción

                        <div className="input-affix">

                          <span>$</span>

                          <input
                            autoFocus
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              rate.price
                            }
                            onChange={(
                              e,
                            ) =>
                              updateRate(
                                rate.id,
                                {
                                  price:
                                    Number(
                                      e
                                        .target
                                        .value,
                                    ),
                                },
                              )
                            }
                          />

                          <span>
                            MXN
                          </span>

                        </div>
                      </label>

                      <label>
                        Duración

                        <select
                          value={
                            rate.fractionMinutes
                          }
                          onChange={(
                            e,
                          ) =>
                            updateRate(
                              rate.id,
                              {
                                fractionMinutes:
                                  Number(
                                    e
                                      .target
                                      .value,
                                  ) as
                                    | 15
                                    | 30
                                    | 45
                                    | 60,
                              },
                            )
                          }
                        >
                          <option value="15">
                            15 minutos
                          </option>

                          <option value="30">
                            30 minutos
                          </option>

                          <option value="45">
                            45 minutos
                          </option>

                          <option value="60">
                            1 hora
                          </option>
                        </select>
                      </label>

                      <label>
                        Tolerancia

                        <input
                          type="number"
                          min="0"
                          value={
                            rate.graceMinutes
                          }
                          onChange={(
                            e,
                          ) =>
                            updateRate(
                              rate.id,
                              {
                                graceMinutes:
                                  Number(
                                    e
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />

                        <small>
                          Minutos sin
                          costo.
                        </small>
                      </label>

                      <label>
                        Máximo diario

                        <input
                          type="number"
                          min="0"
                          value={
                            rate.dailyMax ??
                            0
                          }
                          onChange={(
                            e,
                          ) =>
                            updateRate(
                              rate.id,
                              {
                                dailyMax:
                                  Number(
                                    e
                                      .target
                                      .value,
                                  ) ||
                                  null,
                              },
                            )
                          }
                        />

                        <small>
                          Usa 0 para no
                          limitar.
                        </small>
                      </label>

                    </div>
                  )}

                  {/* PREVIEW */}

                  <div className="rate-preview">

                    <span>
                      {rate.pricingMode ===
                      "free_time"
                        ? "Total de la estancia"
                        : "Ejemplo por 1 hora"}
                    </span>

                    <b>
                      {currency.format(
                        rate.pricingMode ===
                        "free_time"
                          ? rate.flatPrice ??
                              0
                          : Math.ceil(
                              60 /
                                rate.fractionMinutes,
                            ) *
                              rate.price,
                      )}
                    </b>

                  </div>

                  <footer>

                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        closeRateEditor
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        void save(
                          rate,
                        )
                      }
                      disabled={
                        savingId ===
                        rate.id
                      }
                    >
                      {savingId ===
                      rate.id
                        ? "Guardando…"
                        : "Guardar tarifa"}
                    </button>

                  </footer>

                </div>

              </section>
            </div>
          );
        })()}

      {/* =====================================================
          MODAL NUEVO TIPO
      ====================================================== */}

      {adding && (
        <div
          className="backdrop"
          onMouseDown={() =>
            setAdding(false)
          }
        >
          <section
            className="modal vehicle-type-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close"
              onClick={() =>
                setAdding(false)
              }
            >
              ×
            </button>

            <form
              onSubmit={addType}
            >
              <ModalHeader
                overline="NUEVO TIPO"
                title="Alta de tipo de unidad"
                text="La nueva clasificación se agregará a entradas y tendrá su propia tarifa."
              />

              <label>
                Nombre

                <input
                  autoFocus
                  value={
                    typeName
                  }
                  onChange={(e) =>
                    setTypeName(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Ej. Motocicleta"
                  required
                />
              </label>

              <label>
                Descripción

                <input
                  value={
                    typeDescription
                  }
                  onChange={(e) =>
                    setTypeDescription(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Descripción breve"
                />
              </label>

              <div className="form-grid">

                <label>
                  Precio inicial

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      typePrice
                    }
                    onChange={(e) =>
                      setTypePrice(
                        Number(
                          e.target
                            .value,
                        ),
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Fracción

                  <select
                    value={
                      typeFraction
                    }
                    onChange={(e) =>
                      setTypeFraction(
                        Number(
                          e.target
                            .value,
                        ) as
                          | 15
                          | 30
                          | 45
                          | 60,
                      )
                    }
                  >
                    <option value="15">
                      15 minutos
                    </option>

                    <option value="30">
                      30 minutos
                    </option>

                    <option value="45">
                      45 minutos
                    </option>

                    <option value="60">
                      1 hora
                    </option>
                  </select>
                </label>

              </div>

              <button
                className="primary full"
                disabled={
                  savingId ===
                  "new"
                }
              >
                {savingId ===
                "new"
                  ? "Creando…"
                  : "Crear tipo y tarifa"}
              </button>

            </form>

          </section>
        </div>
      )}

    </div>
  );
}