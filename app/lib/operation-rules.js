export const OFFLINE_OPERATION_MESSAGE="Sin conexión: la operación no se guardó. Restablece internet antes de registrar entradas, cobros o movimientos de caja.";

export function assertOperationAllowed(authState,source){
  if(authState==="demo")return;
  if(authState!=="authenticated"||source!=="supabase")throw new Error(OFFLINE_OPERATION_MESSAGE);
}

export function hasOperationPermission(role,permissionCodes,required){
  return role==="super_admin"||role==="owner"||permissionCodes.includes("*")||required.every(code=>permissionCodes.includes(code));
}

export function assertOpenShift(shift,lotId){
  if(shift.status!=="open"||shift.lotId!==lotId)throw new Error("No hay una caja abierta en esta sucursal. Abre un turno antes de cobrar.");
}
