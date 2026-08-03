import type { AppRole } from "@/types/database";

export const STAFF_ROLES: AppRole[] = ["owner", "admin", "regulator", "driver"];
export const REGULATOR_ROLES: AppRole[] = ["owner", "admin", "regulator"];
export const ADMIN_ROLES: AppRole[] = ["owner", "admin"];

export function isStaffRole(role: AppRole | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function canRegulate(role: AppRole | null | undefined): boolean {
  return !!role && REGULATOR_ROLES.includes(role);
}

export function canAdminCompany(role: AppRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}
