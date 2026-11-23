#!/usr/bin/env node
/**
 * Generates ≥5000 distinct Bibulance audit scenarios (combinatorial, not clones).
 * Output: docs/audit/scenarios.json + docs/audit/scenarios-summary.json
 */
import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const outDir = join(root, "docs/audit");

const STATUSES = [
  "incoming",
  "pending_platform",
  "confirmed",
  "assigned",
  "in_progress",
  "done",
  "cancelled",
  "refused",
];

const ROLES = ["patient", "regulator", "admin", "owner", "driver", "anonymous"];

const DISPATCH = ["specific", "partners"];
const BOOKING = ["once", "iterative"];
const TRIP = ["aller", "retour", "aller_retour"];
const TRANSPORT = ["AMB", "VSL", "ambulance", "vsl"];
const DEVICES = ["mobile", "tablet", "desktop", "screen_reader"];
const RELATIVE = [false, true];
const ADDRESS_QUALITY = [
  "exact_ban",
  "partial",
  "typo",
  "missing",
  "foreign",
  "poi_only",
];
const PHONE = ["valid_fr", "short", "missing", "international", "letters"];
const DATE_EDGE = [
  "future_ok",
  "past",
  "today_past_time",
  "today_future",
  "far_future",
  "dst_spring",
  "dst_fall",
  "invalid_format",
];
const SPECIALTY_COMBOS = [
  {},
  { accompagnant: true },
  { fauteuil: true },
  { oxygene: true },
  { accompagnant: true, fauteuil: true },
  { fauteuil: true, oxygene: true, bmr: true },
  { deambulateur: true, accompagnant: true, oxygene: true },
];
const NIR = ["absent", "valid_15", "short", "letters", "spaces_ok"];
const EXCEPTION = [
  "ok",
  "network_drop",
  "double_submit",
  "session_expired",
  "refresh_mid",
  "slow_api",
  "concurrent_edit",
  "webhook_unsigned",
  "cron_bad_secret",
  "rls_patient_update",
];
const REGULATOR_ACTIONS = [
  "accept",
  "refuse",
  "confirm_platform",
  "assign_vehicle",
  "unassign",
  "set_pec",
  "filter_status",
  "search_q",
  "noop",
];
const PATIENT_FOLLOW = [
  "view_upcoming",
  "view_history",
  "cancel_own",
  "reread_status",
  "new_after_refuse",
];

function idFor(parts) {
  const h = createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 10);
  return `SCN-${h}`;
}

/** @type {Array<Record<string, unknown>>} */
const scenarios = [];
const seen = new Set();

function push(scenario) {
  const key = JSON.stringify(scenario.dimensions);
  if (seen.has(key)) return;
  seen.add(key);
  const id = idFor([scenario.category, key]);
  scenarios.push({
    id,
    ...scenario,
    expected: scenario.expected,
  });
}

// --- A: Patient booking matrix ---
let a = 0;
for (const dispatch of DISPATCH) {
  for (const booking of BOOKING) {
    for (const trip of TRIP) {
      for (const transport of TRANSPORT) {
        for (const relative of RELATIVE) {
          for (const addr of ADDRESS_QUALITY) {
            for (const phone of PHONE) {
              for (const dateEdge of DATE_EDGE) {
                for (const device of DEVICES) {
                  if (a >= 1400) break;
                  const nir = NIR[a % NIR.length];
                  const specs = SPECIALTY_COMBOS[a % SPECIALTY_COMBOS.length];
                  const shouldReject =
                    addr === "missing" ||
                    dateEdge === "past" ||
                    dateEdge === "today_past_time" ||
                    dateEdge === "invalid_format" ||
                    phone === "short" ||
                    (relative && phone === "missing") ||
                    nir === "short" ||
                    nir === "letters";

                  push({
                    category: "A_patient_booking",
                    role: "patient",
                    description: `Booking ${dispatch}/${booking}/${trip}/${transport} addr=${addr} date=${dateEdge} device=${device}`,
                    dimensions: {
                      lot: "A",
                      dispatch,
                      booking,
                      trip,
                      transport,
                      relative,
                      addr,
                      phone,
                      dateEdge,
                      device,
                      nir,
                      specs,
                    },
                    actions: ["fill_wizard", "submit"],
                    expected: {
                      outcome: shouldReject ? "validation_error" : "created_or_reachable",
                      http: shouldReject ? 400 : 201,
                    },
                    executable: "schema",
                    severity_if_fail: shouldReject ? "P1" : "P0",
                  });
                  a++;
                }
              }
            }
          }
        }
      }
    }
  }
}

// --- B: Patient status copy ---
for (const status of STATUSES) {
  for (const dispatch of DISPATCH) {
    for (const accepted of [false, true]) {
      for (const follow of PATIENT_FOLLOW) {
        for (const device of DEVICES) {
          push({
            category: "B_patient_followup",
            role: "patient",
            description: `Status ${status} dispatch=${dispatch} accepted=${accepted} action=${follow}`,
            dimensions: {
              lot: "B",
              status,
              dispatch,
              accepted,
              follow,
              device,
            },
            actions: [follow],
            expected: {
              has_label: true,
              has_hint: true,
              cancel_allowed:
                follow === "cancel_own" &&
                !accepted &&
                (status === "incoming" || status === "pending_platform"),
            },
            executable: "status_copy",
            severity_if_fail: "P1",
          });
        }
      }
    }
  }
}

// --- C: Regulator actions × statuses ---
for (const from of STATUSES) {
  for (const to of STATUSES) {
    for (const action of REGULATOR_ACTIONS) {
      for (const role of ["regulator", "admin", "owner", "driver", "patient"]) {
        const allowedPairs = {
          incoming: ["pending_platform", "confirmed", "assigned", "cancelled", "refused", "incoming"],
          pending_platform: [
            "incoming",
            "confirmed",
            "assigned",
            "cancelled",
            "refused",
            "pending_platform",
          ],
          confirmed: ["assigned", "in_progress", "cancelled", "pending_platform", "confirmed"],
          assigned: ["confirmed", "in_progress", "cancelled", "pending_platform", "assigned"],
          in_progress: ["done", "cancelled", "assigned", "in_progress"],
          done: ["done"],
          cancelled: ["cancelled"],
          refused: ["refused"],
        };
        const transitionOk = (allowedPairs[from] ?? []).includes(to);
        push({
          category: "C_regulator",
          role,
          description: `Regulator ${action} ${from}->${to} as ${role}`,
          dimensions: { lot: "C", from, to, action, role },
          actions: [action, "assert_transition"],
          expected: {
            transition_ok: transitionOk,
            staff_only: role === "patient" || role === "anonymous" ? false : true,
            driver_regulate: role === "driver" ? false : true,
          },
          executable: "transitions",
          severity_if_fail: "P0",
        });
      }
    }
  }
}

// --- D: Exceptional ---
for (const ex of EXCEPTION) {
  for (const status of STATUSES) {
    for (const role of ROLES) {
      for (const device of DEVICES) {
        for (const dispatch of DISPATCH) {
          push({
            category: "D_exceptional",
            role,
            description: `Exception ${ex} status=${status} role=${role}`,
            dimensions: { lot: "D", ex, status, role, device, dispatch },
            actions: ["simulate_exception"],
            expected: {
              must_not_corrupt_status: true,
              webhook_unsigned_rejected: ex === "webhook_unsigned",
              patient_rls_update_blocked: ex === "rls_patient_update",
            },
            executable: ex === "webhook_unsigned" ? "webhook" : "documented",
            severity_if_fail: "P0",
          });
        }
      }
    }
  }
}

// --- E: Security / authz payloads ---
const payloads = [
  "empty",
  "sql_injection_name",
  "xss_address",
  "oversized_notes",
  "uuid_other_company",
  "status_jump_done",
  "negative_offset",
  "null_bytes",
  "unicode_rtl",
  "duplicate_idempotency",
];
for (const payload of payloads) {
  for (const role of ROLES) {
    for (const status of STATUSES) {
      for (const dispatch of DISPATCH) {
        for (const transport of ["AMB", "VSL"]) {
          push({
            category: "E_security",
            role,
            description: `Security payload=${payload} role=${role}`,
            dimensions: { lot: "E", payload, role, status, dispatch, transport },
            actions: ["send_malicious"],
            expected: {
              rejected_or_sanitized: true,
              no_status_jump:
                payload === "status_jump_done" && status === "incoming",
            },
            executable: payload === "status_jump_done" ? "transitions" : "schema",
            severity_if_fail: "P0",
          });
        }
      }
    }
  }
}

// --- F: Connectors ---
const platforms = ["amblea", "sps", "scr_urgences", "ptah", "paramedic", "csv", "other"];
const syncModes = ["pull", "webhook", "csv", "manual"];
for (const platform of platforms) {
  for (const mode of syncModes) {
    for (const hasSecret of [true, false]) {
      for (const sig of ["valid", "invalid", "missing"]) {
        for (const body of ["ok_array", "ok_wrapped", "empty", "invalid_json", "huge"]) {
          push({
            category: "F_connectors",
            role: "system",
            description: `Connector ${platform}/${mode} secret=${hasSecret} sig=${sig}`,
            dimensions: { lot: "F", platform, mode, hasSecret, sig, body },
            actions: ["webhook_or_pull"],
            expected: {
              accept:
                mode === "webhook" &&
                ((hasSecret && sig === "valid") ||
                  (!hasSecret && process.env.ALLOW_INSECURE_WEBHOOKS === "1")),
              reject_unsigned: !hasSecret || sig !== "valid",
            },
            executable: "webhook",
            severity_if_fail: "P0",
          });
        }
      }
    }
  }
}

// --- G: A11y / form edge ---
const a11y = [
  "skip_link",
  "label_missing_sim",
  "contrast_emergency",
  "large_tap_target",
  "keyboard_next",
  "aria_live_status",
  "focus_error",
  "lang_fr",
];
for (const check of a11y) {
  for (const device of DEVICES) {
    for (const step of [
      "mode",
      "company",
      "depart",
      "arrival",
      "schedule",
      "identity",
      "transport",
      "confirm",
    ]) {
      for (const relative of RELATIVE) {
        for (const booking of BOOKING) {
          push({
            category: "G_a11y",
            role: "patient",
            description: `A11y ${check} step=${step} device=${device}`,
            dimensions: { lot: "G", check, device, step, relative, booking },
            actions: ["inspect_ui_rule"],
            expected: { documented_rule: true },
            executable: "documented",
            severity_if_fail: "P2",
          });
        }
      }
    }
  }
}

// Top up if under 5000 with cross-product leftovers
let pad = 0;
while (scenarios.length < 5000) {
  const status = STATUSES[pad % STATUSES.length];
  const role = ROLES[pad % ROLES.length];
  const ex = EXCEPTION[pad % EXCEPTION.length];
  const dispatch = DISPATCH[pad % DISPATCH.length];
  const trip = TRIP[pad % TRIP.length];
  const device = DEVICES[pad % DEVICES.length];
  const dateEdge = DATE_EDGE[pad % DATE_EDGE.length];
  push({
    category: "X_cross",
    role,
    description: `Cross pad ${pad} ${status}/${ex}/${dispatch}`,
    dimensions: {
      lot: "X",
      pad,
      status,
      role,
      ex,
      dispatch,
      trip,
      device,
      dateEdge,
      transport: TRANSPORT[pad % TRANSPORT.length],
      relative: pad % 2 === 0,
    },
    actions: ["matrix_cover"],
    expected: { recorded: true },
    executable: "documented",
    severity_if_fail: "P3",
  });
  pad++;
  if (pad > 20000) break;
}

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "scenarios.json");
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), scenarios }, null, 0));

const byCat = {};
const byExec = {};
for (const s of scenarios) {
  byCat[s.category] = (byCat[s.category] ?? 0) + 1;
  byExec[s.executable] = (byExec[s.executable] ?? 0) + 1;
}
const summary = {
  total: scenarios.length,
  uniqueIds: new Set(scenarios.map((s) => s.id)).size,
  byCategory: byCat,
  byExecutable: byExec,
};
writeFileSync(join(outDir, "scenarios-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${scenarios.length} scenarios → ${outPath}`);
