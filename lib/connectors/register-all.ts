import {
  ambleaConnector,
  paramedicConnector,
  ptahConnector,
  scrUrgencesConnector,
  spsConnector,
} from "@/lib/connectors/platforms";
import { csvConnector } from "@/lib/connectors/csv";
import { registerConnector } from "@/lib/connectors/registry";

let registered = false;

/** Idempotent registration of all platform adapters. */
export function ensureConnectorsRegistered() {
  if (registered) return;
  registerConnector(csvConnector);
  registerConnector(ambleaConnector);
  registerConnector(spsConnector);
  registerConnector(scrUrgencesConnector);
  registerConnector(ptahConnector);
  registerConnector(paramedicConnector);
  registered = true;
}
