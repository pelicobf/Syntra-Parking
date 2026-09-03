import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Syntra Parkflow",description:"Control profesional de estacionamientos, accesos, cobros y reportes."};
const resizeObserverGuard=`(()=>{const matches=value=>/ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i.test(String(value?.message??value??""));window.addEventListener("error",event=>{if(!matches(event.error??event.message))return;event.preventDefault();event.stopImmediatePropagation()},true);window.addEventListener("unhandledrejection",event=>{if(!matches(event.reason))return;event.preventDefault();event.stopImmediatePropagation()},true)})();`;
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><head><script dangerouslySetInnerHTML={{__html:resizeObserverGuard}}/></head><body>{children}</body></html>}
