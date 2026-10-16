import { z } from "zod";

import { isDateTimeInPast } from "@/lib/missions/booking-meta";

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

const occurrenceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  trip_type: tripTypeSchema.optional(),
});

export const createPatientMissionSchema = z
  .object({
    company_id: z.string().uuid().optional(),
    dispatch_mode: z.enum(["specific", "partners"]).default("specific"),
    booking_mode: z.enum(["once", "iterative", "recurring"]).default("once"),
    firstname: z.string().min(1, "Prénom requis"),
    lastname: z.string().min(1, "Nom requis"),
    phone: z.string().min(6).optional(),
    depart_address: z.string().min(3, "Adresse de départ requise"),
    arrival_address: z.string().min(3, "Adresse d’arrivée requise"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (YYYY-MM-DD)")
      .optional(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Heure invalide (HH:mm)")
      .optional(),
    transport_type: z.enum(["ambulance", "vsl", "AMB", "VSL"]),
    reason: z.string().optional(),
    comment: z.string().optional(),
    trip_type: tripTypeSchema.default("aller"),
    patient_birthdate: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
        "Date de naissance invalide",
      ),
    patient_social_security: z
      .string()
      .optional()
      .transform((v) => (v ? v.replace(/\D/g, "") : v))
      .refine(
        (v) => !v || /^\d{15}$/.test(v),
        "Le numéro de sécurité sociale doit contenir exactement 15 chiffres",
      ),
    ordered_for_someone: z.boolean().default(false),
    relative_firstname: z.string().optional(),
    relative_lastname: z.string().optional(),
    relative_relation: z.string().optional(),
    relative_phone: z.string().optional(),
    specialties: z
      .object({
        accompagnant: z.boolean().optional(),
        deambulateur: z.boolean().optional(),
        fauteuil: z.boolean().optional(),
        bmr: z.boolean().optional(),
        oxygene: z.boolean().optional(),
      })
      .optional(),
    occurrences: z.array(occurrenceSchema).max(40).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dispatch_mode === "specific" && !data.company_id) {
      ctx.addIssue({
        code: "custom",
        message: "Choisissez une société d’ambulances",
        path: ["company_id"],
      });
    }

    if (data.ordered_for_someone) {
      if (!data.relative_firstname?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Prénom du demandeur requis",
          path: ["relative_firstname"],
        });
      }
      if (!data.relative_lastname?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Nom du demandeur requis",
          path: ["relative_lastname"],
        });
      }
      if (!data.relative_phone?.trim() || data.relative_phone.trim().length < 6) {
        ctx.addIssue({
          code: "custom",
          message: "Téléphone du demandeur requis",
          path: ["relative_phone"],
        });
      }
      if (!data.patient_birthdate) {
        ctx.addIssue({
          code: "custom",
          message: "Date de naissance du patient requise",
          path: ["patient_birthdate"],
        });
      }
    }

    const hasOccurrences = (data.occurrences?.length ?? 0) > 0;
    if (
      data.booking_mode === "iterative" ||
      data.booking_mode === "recurring"
    ) {
      if (!hasOccurrences) {
        ctx.addIssue({
          code: "custom",
          message: "Ajoutez au moins une date de trajet itératif",
          path: ["occurrences"],
        });
      }
      return;
    }

    if (!hasOccurrences) {
      if (!data.date) {
        ctx.addIssue({
          code: "custom",
          message: "Date requise",
          path: ["date"],
        });
      }
      if (!data.time) {
        ctx.addIssue({
          code: "custom",
          message: "Heure requise",
          path: ["time"],
        });
      }
      if (
        data.date &&
        data.time &&
        isDateTimeInPast(data.date, data.time)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "La date et l’heure du rendez-vous ne peuvent pas être dans le passé",
          path: ["time"],
        });
      }
    }

    if (hasOccurrences) {
      const past = data.occurrences!.some((o) =>
        isDateTimeInPast(o.date, o.time),
      );
      if (past) {
        ctx.addIssue({
          code: "custom",
          message:
            "Une ou plusieurs dates de trajet sont déjà passées — choisissez des horaires à venir",
          path: ["occurrences"],
        });
      }
    }
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
