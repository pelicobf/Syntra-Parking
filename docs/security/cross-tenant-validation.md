# Validación de aislamiento multiempresa

La prueba usa dos usuarios reales, cada uno perteneciente exclusivamente a una empresa distinta. Nunca debe ejecutarse con una cuenta `super_admin`, porque ese rol tiene acceso global de manera intencional.

## Preparación

Crea `.env.security.local` sin subirlo al repositorio:

```dotenv
SECURITY_TEST_TENANT_A_EMAIL=usuario-a@example.com
SECURITY_TEST_TENANT_A_PASSWORD=contraseña-a
SECURITY_TEST_TENANT_B_EMAIL=usuario-b@example.com
SECURITY_TEST_TENANT_B_PASSWORD=contraseña-b
SECURITY_TEST_ALLOW_MUTATIONS=true
```

Cada empresa debe tener una sucursal. Para cubrir el RPC de cobro y Realtime por completo, ambas deben tener también una estancia y un turno abierto. La mutación de Realtime escribe el mismo estado que ya tiene la estancia: genera un evento sin cambiar su significado.

Ejecuta:

```bash
npm run security:test-tenants
```

## Controles

- RLS: intenta leer, desde ambos lados, empresas, sucursales, membresías, tarifas, unidades, cajas, turnos, estancias, pagos, auditoría, invitaciones, suscripciones, roles, perfiles y asignaciones ajenas; también intenta actualizar una estancia ajena sin cambiar su valor.
- RPC: comprueba `has_parking_lot_access`, `has_parking_permission`, `calculate_parking_fee` y `checkout_parking_stay` usando identificadores de la otra empresa.
- Edge Functions: intenta crear y modificar personal usando sucursales y membresías de la otra empresa.
- Realtime: se suscribe desde una empresa al identificador de una estancia ajena, emite una actualización inocua desde su propietaria y verifica que el evento no cruce el límite RLS.

El proceso termina con código distinto de cero ante cualquier fuga, configuración incompleta o control no ejecutado. Guarda la salida en el expediente de seguridad de cada versión desplegada.
