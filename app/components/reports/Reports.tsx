"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  CircleDollarSign,
  ParkingCircle,
  TicketCheck,
} from "lucide-react";

import { useParkingStore } from "@/app/hooks/use-parking-store";

import {
  clock,
  currency,
} from "@/app/lib/formatters";

import type {
  ParkingStay,
  Payment,
} from "@/app/types/parking";

type Props = {
  store: ReturnType<
    typeof useParkingStore
  >;
};

export function Reports({
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

  const [
    refreshing,
    setRefreshing,
  ] = useState(true);

  const [
    updatedAt,
    setUpdatedAt,
  ] = useState(new Date());

  const [report, setReport] =
    useState<{
      payments: Payment[];
      stays: ParkingStay[];
    }>({
      payments: [],
      stays: [],
    });

  const [
    queryError,
    setQueryError,
  ] = useState("");

  const canExport =
    [
      "owner",
      "super_admin",
    ].includes(
      store.profile.role,
    ) ||
    store.profile.permissionCodes.includes(
      "reports.export",
    );

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  let start = today;

  let end = new Date(
    today.getTime() +
      86400000,
  );

  if (period === "yesterday") {
    start = new Date(
      today.getTime() -
        86400000,
    );

    end = today;
  }

  if (period === "7") {
    start = new Date(
      today.getTime() -
        6 * 86400000,
    );
  }

  if (period === "30") {
    start = new Date(
      today.getTime() -
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

  async function loadReport() {
    setRefreshing(true);
    setQueryError("");

    try {
      const data =
        await store.queryParkingReport(
          {
            from: rangeFrom,
            to: rangeTo,
          },
        );

      setReport(data);

      setUpdatedAt(
        new Date(),
      );
    } catch (error) {
      setQueryError(
        error instanceof Error
          ? error.message
          : "No fue posible consultar el reporte",
      );
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    setRefreshing(true);
    setQueryError("");

    void store
      .queryParkingReport({
        from: rangeFrom,
        to: rangeTo,
      })
      .then((data) => {
        if (active) {
          setReport(data);

          setUpdatedAt(
            new Date(),
          );
        }
      })
      .catch((error) => {
        if (active) {
          setQueryError(
            error instanceof Error
              ? error.message
              : "No fue posible consultar el reporte",
          );
        }
      })
      .finally(() => {
        if (active) {
          setRefreshing(
            false,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [
    period,
    from,
    to,
    store.lotId,
    store.source,
    rangeFrom,
    rangeTo,
  ]);

  const rows =
    report.payments;

  const income = rows.reduce(
    (sum, payment) =>
      sum + payment.amount,
    0,
  );

  const durationMs =
    Math.max(
      1,
      end.getTime() -
        start.getTime(),
    );

  const dayCount =
    Math.ceil(
      durationMs / 86400000,
    );

  const bucketCount =
    dayCount <= 1
      ? 12
      : Math.min(
          dayCount,
          14,
        );

  const bucketMs =
    durationMs /
    bucketCount;

  const buckets =
    Array.from(
      {
        length: bucketCount,
      },
      (_, index) => {
        const bucketStart =
          new Date(
            start.getTime() +
              index * bucketMs,
          );

        const bucketEnd =
          new Date(
            start.getTime() +
              (index + 1) *
                bucketMs,
          );

        const amount =
          rows
            .filter(
              (payment) => {
                const date =
                  new Date(
                    payment.paidAt,
                  );

                return (
                  date >=
                    bucketStart &&
                  date <
                    bucketEnd
                );
              },
            )
            .reduce(
              (
                sum,
                payment,
              ) =>
                sum +
                payment.amount,
              0,
            );

        return {
          label:
            dayCount <= 1
              ? `${String(
                  bucketStart.getHours(),
                ).padStart(
                  2,
                  "0",
                )}:00`
              : new Intl.DateTimeFormat(
                  "es-MX",
                  {
                    day: "2-digit",
                    month: "short",
                  },
                ).format(
                  bucketStart,
                ),

          amount,
        };
      },
    );

  const maxBucket =
    Math.max(
      ...buckets.map(
        (bucket) =>
          bucket.amount,
      ),
      1,
    );

  const lotStays =
    report.stays;

  const events: {
    at: number;
    delta: number;
  }[] = [];

  const initial =
    lotStays.filter(
      (stay) =>
        new Date(
          stay.enteredAt,
        ) < start &&
        (!stay.exitedAt ||
          new Date(
            stay.exitedAt,
          ) >= start),
    ).length;

  lotStays.forEach(
    (stay) => {
      const entered =
        new Date(
          stay.enteredAt,
        ).getTime();

      const exited =
        stay.exitedAt
          ? new Date(
              stay.exitedAt,
            ).getTime()
          : null;

      if (
        entered >=
          start.getTime() &&
        entered <
          end.getTime()
      ) {
        events.push({
          at: entered,
          delta: 1,
        });
      }

      if (
        exited &&
        exited >=
          start.getTime() &&
        exited <
          end.getTime()
      ) {
        events.push({
          at: exited,
          delta: -1,
        });
      }
    },
  );

  events.sort(
    (a, b) =>
      a.at - b.at,
  );

  let occupancy =
    initial;

  let maxOccupancy =
    initial;

  events.forEach(
    (event) => {
      occupancy +=
        event.delta;

      maxOccupancy =
        Math.max(
          maxOccupancy,
          occupancy,
        );
    },
  );

  const occupancyPercent =
    store.lot.capacity
      ? Math.round(
          (maxOccupancy /
            store.lot
              .capacity) *
            100,
        )
      : 0;

  function exportCsv() {
    const lines = [
      [
        "Fecha",
        "Folio",
        "Método",
        "Importe",
      ],

      ...rows.map(
        (payment) => [
          new Date(
            payment.paidAt,
          ).toLocaleString(
            "es-MX",
          ),

          report.stays.find(
            (stay) =>
              stay.id ===
              payment.stayId,
          )?.folio ?? "",

          payment.method,

          String(
            payment.amount,
          ),
        ],
      ),
    ];

    const blob = new Blob(
      [
        "\ufeff" +
          lines
            .map((line) =>
              line
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
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      `reporte-${store.lot.code}-${from || period}.csv`;

    link.click();

    URL.revokeObjectURL(
      url,
    );
  }

  return (
    <div className="screen reports-screen">

      <section className="report-toolbar">

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
                onClick={() =>
                  setPeriod(
                    value as typeof period,
                  )
                }
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
                onChange={(e) =>
                  setFrom(
                    e.target.value,
                  )
                }
              />
            </label>

            <label>
              Hasta

              <input
                type="date"
                value={to}
                onChange={(e) =>
                  setTo(
                    e.target.value,
                  )
                }
              />
            </label>

          </div>
        )}

        <div className="report-actions">

          <small>
            <i />
            Última consulta ·{" "}
            {clock.format(
              updatedAt,
            )}
          </small>

          <button
            className="secondary"
            onClick={() =>
              void loadReport()
            }
            disabled={
              refreshing
            }
          >
            {refreshing
              ? "Actualizando…"
              : "↻ Actualizar"}
          </button>

          {canExport && (
            <button
              className="secondary"
              onClick={
                exportCsv
              }
              disabled={
                !rows.length ||
                refreshing
              }
            >
              ↓ Exportar CSV
            </button>
          )}

        </div>

      </section>

      {queryError && (
        <div className="cuts-query-error">
          <AlertTriangle />
          {queryError}
        </div>
      )}

      <section className="report-kpi-grid">

        <article className="income">
          <span>
            <CircleDollarSign />
          </span>

          <div>
            <small>
              INGRESOS
            </small>

            <strong>
              {refreshing
                ? "…"
                : currency.format(
                    income,
                  )}
            </strong>

            <p>
              Pagos confirmados
            </p>
          </div>
        </article>

        <article className="tickets">

          <span>
            <TicketCheck />
          </span>

          <div>
            <small>
              BOLETOS COBRADOS
            </small>

            <strong>
              {refreshing
                ? "…"
                : String(
                    rows.length,
                  )}
            </strong>

            <p>
              Operaciones completadas
            </p>
          </div>
        </article>

        <article className="occupancy">

          <span>
            <ParkingCircle />
          </span>

          <div>
            <small>
              OCUPACIÓN MÁXIMA
            </small>

            <strong>
              {refreshing
                ? "…"
                : `${occupancyPercent}%`}
            </strong>

            <p>
              {maxOccupancy} de{" "}
              {store.lot.capacity}{" "}
              espacios
            </p>
          </div>
        </article>

      </section>

      <article
        className={`card chart report-chart ${
          refreshing
            ? "loading"
            : ""
        }`}
      >
        <div className="card-head">

          <div>
            <p className="eyebrow">
              INGRESOS DEL PERIODO
            </p>

            <h3>
              Comportamiento de
              ingresos
            </h3>
          </div>

          <b>
            {refreshing
              ? "…"
              : currency.format(
                  income,
                )}
          </b>

        </div>

        <div className="bars">

          {buckets.map(
            (
              bucket,
              index,
            ) => (
              <div
                key={`${bucket.label}-${index}`}
                title={`${bucket.label}: ${currency.format(
                  bucket.amount,
                )}`}
              >
                <b>
                  {bucket.amount
                    ? currency.format(
                        bucket.amount,
                      )
                    : ""}
                </b>

                <span
                  style={{
                    height: `${Math.max(
                      (bucket.amount /
                        maxBucket) *
                        100,
                      bucket.amount
                        ? 6
                        : 1,
                    )}%`,
                  }}
                />

                <small>
                  {bucket.label}
                </small>

              </div>
            ),
          )}

        </div>

        {!refreshing &&
          !rows.length && (
            <p className="report-empty">
              No hay cobros
              registrados en el
              periodo seleccionado.
            </p>
          )}

      </article>

    </div>
  );
}