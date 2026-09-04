"use client";

import {
  CarFront,
  ChevronRight,
} from "lucide-react";

import {
  clock,
} from "@/app/lib/formatters";

import {
  minutesSince,
} from "@/app/lib/parking";

import type {
  ParkingStay,
} from "@/app/types/parking";

function duration(iso: string) {
  const mins = minutesSince(iso);

  const hours = Math.floor(
    mins / 60
  );

  return `${
    hours ? `${hours} h ` : ""
  }${mins % 60} min`;
}

type StayListProps = {
  stays: ParkingStay[];

  onOpen: (
    stay: ParkingStay
  ) => void;

  canOperate?: boolean;
};

export function StayList({
  stays,
  onOpen,
  canOperate = true,
}: StayListProps) {
  return (
    <div className="stay-list">

      {stays.map((stay) => {
        const completed =
          stay.status === "paid";

        return (
          <button
            className={`stay ${
              completed
                ? "completed"
                : ""
            }`}
            key={stay.id}
            onClick={() => {
              if (
                !completed &&
                canOperate
              ) {
                onOpen(stay);
              }
            }}
            disabled={completed}
          >
            <span className="vehicle-icon">
              <CarFront size={19} />
            </span>

            <div>
              <b>{stay.plate}</b>

              <small>
                {stay.make}{" "}
                {stay.model} ·{" "}
                {stay.color} ·{" "}
                {stay.folio}
              </small>
            </div>

            <p>
              <small>Entrada</small>

              <b>
                {clock.format(
                  new Date(
                    stay.enteredAt
                  )
                )}
              </b>
            </p>

            <p>
              <small>
                {completed
                  ? "Salida"
                  : "Estancia"}
              </small>

              <b>
                {completed &&
                stay.exitedAt
                  ? clock.format(
                      new Date(
                        stay.exitedAt
                      )
                    )
                  : duration(
                      stay.enteredAt
                    )}
              </b>
            </p>

            <span className="stay-state">

              <em
                className={
                  stay.status ===
                  "pending_payment"
                    ? "warning"
                    : completed
                    ? "completed"
                    : ""
                }
              >
                ●{" "}
                {stay.status ===
                "pending_payment"
                  ? "Por cobrar"
                  : completed
                  ? "Salida registrada"
                  : "Activo"}
              </em>

              <strong>
                {completed
                  ? "Completado"
                  : canOperate
                  ? stay.status ===
                    "pending_payment"
                    ? "Cobrar"
                    : "Procesar salida"
                  : "Solo consulta"}
              </strong>

            </span>

            {!completed &&
              canOperate && (
                <ChevronRight
                  className="row-chevron"
                  size={18}
                />
              )}
          </button>
        );
      })}

      {!stays.length && (
        <div className="empty">
          No hay movimientos para
          mostrar.
        </div>
      )}

    </div>
  );
}