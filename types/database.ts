export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "owner" | "admin" | "regulator" | "driver" | "patient";
export type VehicleType = "AMB" | "VSL";
export type TripType = "aller" | "retour" | "aller_retour";
export type MissionStatus =
  | "incoming"
  | "pending_platform"
  | "confirmed"
  | "assigned"
  | "in_progress"
  | "done"
  | "cancelled"
  | "refused";
export type SourcePlatform =
  | "amblea"
  | "sps"
  | "scr_urgences"
  | "ptah"
  | "paramedic"
  | "bibulance_web"
  | "csv"
  | "manual"
  | "other";
export type ConnectorSyncMode = "pull" | "webhook" | "csv" | "manual";
export type SyncRunStatus = "running" | "success" | "partial" | "failed";

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          siret: string | null;
          timezone: string;
          settings: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          siret?: string | null;
          timezone?: string;
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          primary_role: AppRole;
          default_company_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          primary_role?: AppRole;
          default_company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      company_memberships: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          role: AppRole;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          role: AppRole;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_memberships"]["Insert"]>;
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          owner_user_id: string | null;
          company_id: string | null;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          phone: string | null;
          nir_encrypted: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id?: string | null;
          company_id?: string | null;
          first_name: string;
          last_name: string;
          date_of_birth?: string | null;
          phone?: string | null;
          nir_encrypted?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          vehicle_type: VehicleType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          vehicle_type: VehicleType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
          vehicle_id: string | null;
          display_name: string;
          status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id?: string | null;
          vehicle_id?: string | null;
          display_name: string;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["drivers"]["Insert"]>;
        Relationships: [];
      };
      missions: {
        Row: {
          id: string;
          company_id: string;
          source_platform: SourcePlatform;
          source_mission_id: string | null;
          external_payload: Json;
          sync_hash: string | null;
          status: MissionStatus;
          rdv_time: string;
          pec_estimated_time: string | null;
          pec_set_by: string | null;
          emitter_facility: string | null;
          emitter_address: string | null;
          destination_facility: string | null;
          destination_address: string | null;
          patient_id: string | null;
          patient_first_name: string | null;
          patient_last_name: string | null;
          vehicle_type: VehicleType | null;
          trip_type: TripType;
          care_type: string | null;
          floor_info: string | null;
          notes: string | null;
          specialties: Json;
          contract_required: boolean;
          accepted_bibulance: boolean;
          platform_confirmation: boolean;
          assigned_vehicle_id: string | null;
          assigned_driver_id: string | null;
          is_locked: boolean;
          created_by: string | null;
          accepted_at: string | null;
          platform_confirmed_at: string | null;
          assigned_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          source_platform: SourcePlatform;
          source_mission_id?: string | null;
          external_payload?: Json;
          sync_hash?: string | null;
          status?: MissionStatus;
          rdv_time: string;
          pec_estimated_time?: string | null;
          pec_set_by?: string | null;
          emitter_facility?: string | null;
          emitter_address?: string | null;
          destination_facility?: string | null;
          destination_address?: string | null;
          patient_id?: string | null;
          patient_first_name?: string | null;
          patient_last_name?: string | null;
          vehicle_type?: VehicleType | null;
          trip_type?: TripType;
          care_type?: string | null;
          floor_info?: string | null;
          notes?: string | null;
          specialties?: Json;
          contract_required?: boolean;
          accepted_bibulance?: boolean;
          platform_confirmation?: boolean;
          assigned_vehicle_id?: string | null;
          assigned_driver_id?: string | null;
          is_locked?: boolean;
          created_by?: string | null;
          accepted_at?: string | null;
          platform_confirmed_at?: string | null;
          assigned_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["missions"]["Insert"]>;
        Relationships: [];
      };
      mission_events: {
        Row: {
          id: string;
          mission_id: string;
          company_id: string;
          actor_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          company_id: string;
          actor_id?: string | null;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_events"]["Insert"]>;
        Relationships: [];
      };
      company_connectors: {
        Row: {
          id: string;
          company_id: string;
          platform: SourcePlatform;
          display_name: string | null;
          sync_mode: ConnectorSyncMode;
          credentials_encrypted: string | null;
          config: Json;
          webhook_secret: string | null;
          is_enabled: boolean;
          last_sync_at: string | null;
          last_error: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          platform: SourcePlatform;
          display_name?: string | null;
          sync_mode?: ConnectorSyncMode;
          credentials_encrypted?: string | null;
          config?: Json;
          webhook_secret?: string | null;
          is_enabled?: boolean;
          last_sync_at?: string | null;
          last_error?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_connectors"]["Insert"]>;
        Relationships: [];
      };
      sync_runs: {
        Row: {
          id: string;
          connector_id: string;
          company_id: string;
          status: SyncRunStatus;
          started_at: string;
          finished_at: string | null;
          stats: Json;
          error: string | null;
        };
        Insert: {
          id?: string;
          connector_id: string;
          company_id: string;
          status?: SyncRunStatus;
          started_at?: string;
          finished_at?: string | null;
          stats?: Json;
          error?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["sync_runs"]["Insert"]>;
        Relationships: [];
      };
      sync_cursors: {
        Row: {
          connector_id: string;
          cursor_key: string;
          cursor_value: string;
          updated_at: string;
        };
        Insert: {
          connector_id: string;
          cursor_key: string;
          cursor_value: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sync_cursors"]["Insert"]>;
        Relationships: [];
      };
      company_invites: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          role: AppRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          email: string;
          role: AppRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_invites"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_company_ids: {
        Args: Record<string, unknown>;
        Returns: string[];
      };
      has_company_role: {
        Args: { p_company_id: string; p_roles: AppRole[] };
        Returns: boolean;
      };
      is_company_member: {
        Args: { p_company_id: string };
        Returns: boolean;
      };
      is_mission_owner: {
        Args: { p_mission_id: string };
        Returns: boolean;
      };
      is_staff_for_mission: {
        Args: { p_mission_id: string };
        Returns: boolean;
      };
      is_staff_user: {
        Args: Record<string, unknown>;
        Returns: boolean;
      };
      create_company: {
        Args: { p_name: string; p_slug: string; p_siret?: string | null };
        Returns: Database["public"]["Tables"]["companies"]["Row"];
      };
      accept_company_invite: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["company_memberships"]["Row"];
      };
      soft_delete_mission: {
        Args: { p_mission_id: string };
        Returns: undefined;
      };
      list_bookable_companies: {
        Args: Record<string, unknown>;
        Returns: { id: string; name: string; slug: string }[];
      };
      company_pec_offset_minutes: {
        Args: { p_company_id: string };
        Returns: number;
      };
    };
    CompositeTypes: {
      [_ in never]: never;
    };
    Enums: {
      app_role: AppRole;
      vehicle_type: VehicleType;
      trip_type: TripType;
      mission_status: MissionStatus;
      source_platform: SourcePlatform;
      connector_sync_mode: ConnectorSyncMode;
      sync_run_status: SyncRunStatus;
    };
  };
};

export type Mission = Database["public"]["Tables"]["missions"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
