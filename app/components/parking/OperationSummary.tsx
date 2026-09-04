import {
  CarFront,
  ParkingCircle,
  TicketCheck,
} from "lucide-react";

type OperationSummaryProps = {
  active: number;
  available: number;
  capacity: number;
  occupancy: number;
  pending: number;
};

export function OperationSummary({
  active,
  available,
  capacity,
  occupancy,
  pending,
}: OperationSummaryProps) {
  return (
    <section className="operation-summary">

      <article>
        <span className="summary-icon green">
          <CarFront />
        </span>

        <div>
          <small>
            Vehículos activos
          </small>
          <b>{active}</b>
        </div>

        <em>
          {occupancy}% ocupado
        </em>
      </article>

      <article>
        <span className="summary-icon blue">
          <ParkingCircle />
        </span>

        <div>
          <small>
            Espacios libres
          </small>
          <b>{available}</b>
        </div>

        <em>de {capacity}</em>
      </article>

      <article
        className={
          pending
            ? "attention"
            : ""
        }
      >
        <span className="summary-icon amber">
          <TicketCheck />
        </span>

        <div>
          <small>Por cobrar</small>
          <b>{pending}</b>
        </div>

        <em>
          {pending
            ? "Requiere atención"
            : "Todo al día"}
        </em>
      </article>

    </section>
  );
}