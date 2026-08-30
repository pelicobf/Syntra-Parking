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
3. Ejecuta `supabase/migrations/20260830170000_profiles_roles_permissions.sql` para crear perfiles, roles y permisos.
4. Ejecuta `npm install` y `npm run dev`.

El frontend puede recuperar el contexto completo del usuario con:

```sql
select * from public.get_my_parking_context();
```

Y validar una acción específica mediante:

```sql
select public.has_parking_permission(
  'UUID_DE_LA_EMPRESA',
  'stays.checkout'
);
```
