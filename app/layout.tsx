import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Syntra Parkflow",description:"Control profesional de estacionamientos, accesos, cobros y reportes."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
