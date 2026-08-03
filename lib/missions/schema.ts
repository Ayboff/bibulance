import { z } from "zod";

export const vehicleTypeSchema = z.enum(["AMB", "VSL"]);
export const tripTypeSchema = z.enum(["aller", "retour", "aller_retour"]);
export const sourcePlatformSchema = z.enum([
  "amblea",
  "sps",
  "scr_urgences",
  "ptah",
  "paramedic",
  "bibulance_web",
  "csv",
  "manual",
  "other",
]);

export const missionStatusSchema = z.enum([
  "incoming",
  "pending_platform",
  "confirmed",
  "assigned",
  "in_progress",
  "done",
  "cancelled",
  "refused",
]);

export const createPatientMissionSchema = z.object({
  company_id: z.string().uuid(),
  firstname: z.string().min(1, "Prénom requis"),
  lastname: z.string().min(1, "Nom requis"),
  phone: z.string().min(6).optional(),
  depart_address: z.string().min(3, "Adresse de départ requise"),
  arrival_address: z.string().min(3, "Adresse d’arrivée requise"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide (HH:mm)"),
  transport_type: z.enum(["ambulance", "vsl", "AMB", "VSL"]),
  reason: z.string().optional(),
  comment: z.string().optional(),
  trip_type: tripTypeSchema.default("aller"),
  patient_birthdate: z.string().optional(),
  specialties: z
    .object({
      accompagnant: z.boolean().optional(),
      deambulateur: z.boolean().optional(),
      fauteuil: z.boolean().optional(),
      bmr: z.boolean().optional(),
      oxygene: z.boolean().optional(),
    })
    .optional(),
});

export const listMissionsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: missionStatusSchema.optional(),
  source_platform: sourcePlatformSchema.optional(),
  q: z.string().max(100).optional(),
  scope: z.enum(["company", "mine"]).default("company"),
  include_confirmed: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const updateMissionSchema = z
  .object({
    accepted_bibulance: z.boolean().optional(),
    platform_confirmation: z.boolean().optional(),
    status: missionStatusSchema.optional(),
    assigned_vehicle_id: z.string().uuid().nullable().optional(),
    assigned_driver_id: z.string().uuid().nullable().optional(),
    is_locked: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucun champ à mettre à jour",
  });

export const updatePecSchema = z.object({
  pec_estimated_time: z.string().min(1, "Heure PEC requise"),
});

export type CreatePatientMissionInput = z.infer<typeof createPatientMissionSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;
export type UpdatePecInput = z.infer<typeof updatePecSchema>;

/** Loose query type for service layer (defaults applied by Zod at API boundary). */
export type ListMissionsQuery = {
  date?: string;
  status?: z.infer<typeof missionStatusSchema>;
  source_platform?: z.infer<typeof sourcePlatformSchema>;
  q?: string;
  scope: "company" | "mine";
  include_confirmed?: boolean;
};

export function normalizeVehicleType(
  value: CreatePatientMissionInput["transport_type"],
): "AMB" | "VSL" {
  if (value === "AMB" || value === "ambulance") return "AMB";
  return "VSL";
}

/** Build ISO timestamptz from local date+time (Europe/Paris assumed as wall clock). */
export function buildRdvIso(date: string, time: string): string {
  return `${date}T${time}:00`;
}
