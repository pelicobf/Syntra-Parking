"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

export function TicketCodes({ token, barcode }: { token: string; barcode: string }) {
  const qr = useRef<HTMLCanvasElement>(null); const bar = useRef<SVGSVGElement>(null);
  useEffect(() => { if (qr.current) QRCode.toCanvas(qr.current, token, { width: 148, margin: 1, errorCorrectionLevel: "M", color: { dark: "#14202B", light: "#FFFFFF" } }); }, [token]);
  useEffect(() => { if (bar.current) JsBarcode(bar.current, barcode, { format: "CODE128", width: 1.45, height: 42, margin: 0, displayValue: true, fontSize: 11 }); }, [barcode]);
  return <div className="ticket-codes"><canvas ref={qr} aria-label="Código QR escaneable"/><svg ref={bar} aria-label="Código de barras escaneable"/></div>;
}
