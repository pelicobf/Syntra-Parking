# Syntra Parkflow

Aplicación responsive para operar estacionamientos públicos con la arquitectura de Syntra POS: módulos, empresa/sucursal activa, roles, turnos, caja, reportes y Supabase.

## Funciones

- Entrada por placa con QR y código de barras CODE128 reales.
- Boleto imprimible para impresora térmica.
- Salida por escaneo o búsqueda y cobro por fracciones configurables.
- Sucursales, usuarios, roles, turnos, cortes y reportes.
- Modo demostración local cuando no existen credenciales de Supabase.

## Inicio

1. Copia `.env.example` a `.env.local`.
2. Ejecuta `supabase/migrations/20260830150000_syntra_parkflow.sql` en Supabase.
3. Ejecuta `npm install` y `npm run dev`.
