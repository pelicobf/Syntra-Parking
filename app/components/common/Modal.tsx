"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  children,
  className = "",
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="backdrop"
      onMouseDown={onClose}
    >
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        {children}
      </section>
    </div>
  );
}