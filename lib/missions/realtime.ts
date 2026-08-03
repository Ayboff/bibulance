"use client";

import { useCallback, useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Mission } from "@/types/database";

type MissionChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  mission: Mission;
};

/**
 * Subscribe to mission changes for a company (pro dashboard).
 */
export function useCompanyMissionsRealtime(
  companyId: string | null | undefined,
  onChange: (change: MissionChange) => void,
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`missions-company-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missions",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const eventType = payload.eventType as MissionChange["eventType"];
          const row = (payload.new ?? payload.old) as Mission;
          if (!row?.id) return;
          cb.current({ eventType, mission: row });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId]);
}

/**
 * Subscribe to a single mission (patient view — PEC updates).
 */
export function useMissionRealtime(
  missionId: string | null | undefined,
  onUpdate: (mission: Mission) => void,
) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!missionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`mission-${missionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "missions",
          filter: `id=eq.${missionId}`,
        },
        (payload) => {
          const row = payload.new as Mission;
          if (row?.id) cb.current(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [missionId]);
}

export function useMissionsCreatedByRealtime(
  userId: string | null | undefined,
  onChange: (change: MissionChange) => void,
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  const stable = useCallback(onChange, [onChange]);
  void stable;

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`missions-mine-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missions",
          filter: `created_by=eq.${userId}`,
        },
        (payload) => {
          const eventType = payload.eventType as MissionChange["eventType"];
          const row = (payload.new ?? payload.old) as Mission;
          if (!row?.id) return;
          cb.current({ eventType, mission: row });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
