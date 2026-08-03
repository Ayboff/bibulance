import { ApiError } from "@/lib/api/http";
import type { SessionContext } from "@/lib/auth/session";
import { canRegulate } from "@/lib/auth/rbac";
import type { Database, VehicleType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

function assertFleetAccess(session: SessionContext) {
  if (!canRegulate(session.activeRole) || !session.activeCompanyId) {
    throw new ApiError(403, "Accès parc réservé au staff régulateur");
  }
}

export async function listCompanyDrivers(client: Client, companyId: string) {
  const { data, error } = await client
    .from("drivers")
    .select("*")
    .eq("company_id", companyId)
    .order("display_name");
  if (error) throw new ApiError(500, error.message);
  return data ?? [];
}

export async function createVehicle(
  client: Client,
  session: SessionContext,
  input: { code: string; vehicle_type: VehicleType },
) {
  assertFleetAccess(session);
  const { data, error } = await client
    .from("vehicles")
    .insert({
      company_id: session.activeCompanyId!,
      code: input.code.trim(),
      vehicle_type: input.vehicle_type,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw new ApiError(400, error.message);
  return data;
}

export async function updateVehicle(
  client: Client,
  session: SessionContext,
  id: string,
  input: Partial<{ code: string; vehicle_type: VehicleType; is_active: boolean }>,
) {
  assertFleetAccess(session);
  const { data, error } = await client
    .from("vehicles")
    .update(input)
    .eq("id", id)
    .eq("company_id", session.activeCompanyId!)
    .select("*")
    .single();
  if (error) throw new ApiError(400, error.message);
  return data;
}

export async function createDriver(
  client: Client,
  session: SessionContext,
  input: {
    display_name: string;
    vehicle_id?: string | null;
    status?: string;
  },
) {
  assertFleetAccess(session);
  const { data, error } = await client
    .from("drivers")
    .insert({
      company_id: session.activeCompanyId!,
      display_name: input.display_name.trim(),
      vehicle_id: input.vehicle_id ?? null,
      status: input.status ?? "available",
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw new ApiError(400, error.message);
  return data;
}

export async function updateDriver(
  client: Client,
  session: SessionContext,
  id: string,
  input: Partial<{
    display_name: string;
    vehicle_id: string | null;
    status: string;
    is_active: boolean;
  }>,
) {
  assertFleetAccess(session);
  const { data, error } = await client
    .from("drivers")
    .update(input)
    .eq("id", id)
    .eq("company_id", session.activeCompanyId!)
    .select("*")
    .single();
  if (error) throw new ApiError(400, error.message);
  return data;
}
