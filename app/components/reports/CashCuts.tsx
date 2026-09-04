"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  WalletCards,
} from "lucide-react";

import { Stat } from "@/app/components/common/Stat";

import { useParkingStore } from "@/app/hooks/use-parking-store";

import { currency } from "@/app/lib/formatters";

import type { CashCut } from "@/app/types/parking";

type Props = {
  store: ReturnType<
    typeof useParkingStore
  >;
};

export function CashCuts({
  store,
}: Props) {
  const [period, setPeriod] =
    useState<
      | "today"
      | "yesterday"
      | "7"
      | "30"
      | "custom"
    >("today");

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<{
      rows: CashCut[];
      total: number;
      totalExpected: number;
      totalCounted: number;
    }>({
      rows: [],
      total: 0,
      totalExpected: 0,
      totalCounted: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [
    queryError,
    setQueryError,
  ] = useState("");

  const nowDate = new Date();

  const startToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  );

  let start = startToday;

  let end = new Date(
    startToday.getTime() +
      86400000,
  );

  if (period === "yesterday") {
    start = new Date(
      startToday.getTime() -
        86400000,
    );

    end = startToday;
  }

  if (period === "7") {
    start = new Date(
      startToday.getTime() -
        6 * 86400000,
    );
  }

  if (period === "30") {
    start = new Date(
      startToday.getTime() -
        29 * 86400000,
    );
  }

  if (period === "custom") {
    if (from) {
      start = new Date(
        `${from}T00:00:00`,
      );
    }

    if (to) {
      end = new Date(
        new Date(
          `${to}T00:00:00`,
        ).getTime() + 86400000,
      );
    }
  }

  const rangeFrom =
    start.toISOString();

  const rangeTo =
    end.toISOString();

  useEffect(() => {
    let active = true;

    setLoading(true);
    setQueryError("");

    void store
      .queryCashCuts({
        from: rangeFrom,
        to: rangeTo,
        page,
        pageSize: 5,
      })
      .then((data) => {
        if (active) {
          setResult(data);
        }
      })
      .catch((error) => {
        if (active) {
          setQueryError(
            error instanceof Error
              ? error.message
              : "No fue posible consultar los cortes",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    period,
    from,
    to,
    page,
    store.lotId,
    store.source,
    rangeFrom,
    rangeTo,
  ]);

  const rows = result.rows;

  const totalExpected =
    result.totalExpected;

  const totalCounted =
    result.totalCounted;

  const difference =
    totalCounted -
    totalExpected;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        result.total / 5,
      ),
    );

  const dateTime =
    new Intl.DateTimeFormat(
      "es-MX",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  return (
    <div className="screen cash-cuts-screen">

      <section className="cash-cut-toolbar">

        <div className="cut-presets">
          {[
            ["today", "Hoy"],
            ["yesterday", "Ayer"],
            ["7", "7 días"],
            ["30", "30 días"],
            [
              "custom",
              "Personalizado",
            ],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                className={
                  period === value
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setPeriod(
                    value as typeof period,
                  );

                  setPage(1);
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {period === "custom" && (
          <div className="custom-dates">

            <label>
              Desde

              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(
                    e.target.value,
                  );

                  setPage(1);
                }}
              />
            </label>

            <label>
              Hasta

              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(
                    e.target.value,
                  );

                  setPage(1);
                }}
              />
            </label>

          </div>
        )}

      </section>

      <section className="stats three">

        <Stat
          label="Cortes realizados"
          value={
            loading
              ? "…"
              : String(
                  result.total,
                )
          }
          hint="En el periodo seleccionado"
          tone="blue"
          icon={CalendarRange}
        />

        <Stat
          label="Efectivo esperado"
          value={
            loading
              ? "…"
              : currency.format(
                  totalExpected,
                )
          }
          hint="Suma de todos los cortes"
          tone="green"
          icon={
            CircleDollarSign
          }
        />

        <Stat
          label="Diferencia acumulada"
          value={
            loading
              ? "…"
              : currency.format(
                  difference,
                )
          }
          hint={
            difference === 0
              ? "Cajas balanceadas"
              : difference > 0
              ? "Sobrante acumulado"
              : "Faltante acumulado"
          }
          tone="amber"
          icon={WalletCards}
        />

      </section>

      {queryError && (
        <div className="cuts-query-error">
          <AlertTriangle />
          {queryError}
        </div>
      )}

      <article
        className={`card table-card cuts-table ${
          loading
            ? "loading"
            : ""
        }`}
      >
        <div className="card-head">

          <div>
            <p className="eyebrow">
              HISTORIAL DE CIERRES
            </p>

            <h3>
              Detalle por usuario
            </h3>
          </div>

          <span>
            {result.total}{" "}
            {result.total === 1
              ? "corte"
              : "cortes"}
          </span>

        </div>

        <table>

          <thead>
            <tr>
              <th>
                Fecha de cierre
              </th>

              <th>Usuario</th>
              <th>Caja</th>
              <th>Duración</th>

              <th>
                Fondo inicial
              </th>

              <th>Esperado</th>
              <th>Contado</th>

              <th>
                Diferencia
              </th>
            </tr>
          </thead>

          <tbody>

            {rows.length ? (
              rows.map((cut) => {
                const register =
                  store.cashRegisters.find(
                    (item) =>
                      item.id ===
                      cut.cashRegisterId,
                  );

                const diff =
                  cut.countedCash -
                  cut.expectedCash;

                const totalMinutes =
                  Math.max(
                    0,
                    Math.round(
                      (new Date(
                        cut.closedAt,
                      ).getTime() -
                        new Date(
                          cut.openedAt,
                        ).getTime()) /
                        60000,
                    ),
                  );

                return (
                  <tr key={cut.id}>

                    <td data-label="Cierre">
                      <b>
                        {dateTime.format(
                          new Date(
                            cut.closedAt,
                          ),
                        )}
                      </b>

                      <small className="table-subtitle">
                        Apertura:{" "}
                        {dateTime.format(
                          new Date(
                            cut.openedAt,
                          ),
                        )}
                      </small>
                    </td>

                    <td data-label="Usuario">
                      <b>
                        {cut.closedBy}
                      </b>

                      <small className="table-subtitle">
                        Cerró el turno
                      </small>
                    </td>

                    <td data-label="Caja">
                      {register?.name ??
                        "Caja"}

                      <small className="table-subtitle">
                        {register?.code ??
                          "—"}
                      </small>
                    </td>

                    <td data-label="Duración">
                      {Math.floor(
                        totalMinutes /
                          60,
                      )}{" "}
                      h{" "}
                      {totalMinutes %
                        60}{" "}
                      min
                    </td>

                    <td data-label="Fondo inicial">
                      {currency.format(
                        cut.openingCash,
                      )}
                    </td>

                    <td data-label="Esperado">
                      {currency.format(
                        cut.expectedCash,
                      )}
                    </td>

                    <td data-label="Contado">
                      <b>
                        {currency.format(
                          cut.countedCash,
                        )}
                      </b>
                    </td>

                    <td data-label="Diferencia">
                      <em
                        className={`cut-difference ${
                          diff === 0
                            ? "balanced"
                            : diff > 0
                            ? "surplus"
                            : "shortage"
                        }`}
                      >
                        {diff > 0
                          ? "+"
                          : ""}

                        {currency.format(
                          diff,
                        )}
                      </em>
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr className="cuts-empty-row">
                <td
                  colSpan={8}
                  className="empty"
                >
                  {loading
                    ? "Consultando cortes…"
                    : "No hay cortes de caja en el periodo seleccionado."}
                </td>
              </tr>
            )}

          </tbody>

        </table>

        {result.total > 5 && (
          <nav
            className="cuts-pagination"
            aria-label="Paginación de cortes"
          >
            <button
              disabled={
                page === 1 ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                )
              }
            >
              <ChevronLeft />
              Anterior
            </button>

            <span>
              Página <b>{page}</b>{" "}
              de {totalPages}
            </span>

            <button
              disabled={
                page >=
                  totalPages ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    Math.min(
                      totalPages,
                      value + 1,
                    ),
                )
              }
            >
              Siguiente
              <ChevronRight />
            </button>

          </nav>
        )}

      </article>

    </div>
  );
}