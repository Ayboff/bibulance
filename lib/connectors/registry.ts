import type { MissionConnector } from "@/lib/connectors/types";
import type { SourcePlatform } from "@/types/database";

/**
 * Registry of platform adapters.
 * Concrete connectors (Ambléa, SPS, …) are registered in Phase 3.
 */
const registry = new Map<SourcePlatform, MissionConnector>();

export function registerConnector(connector: MissionConnector) {
  registry.set(connector.platform, connector);
}

export function getConnector(platform: SourcePlatform): MissionConnector | undefined {
  return registry.get(platform);
}

export function listConnectors(): MissionConnector[] {
  return Array.from(registry.values());
}
