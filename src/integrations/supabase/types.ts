export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_counters: {
        Row: {
          prefix: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          prefix: string;
          updated_at?: string;
          value?: number;
        };
        Update: {
          prefix?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          created_at: string;
          details: Json;
          entity: string;
          id: string;
          ticket_id: string | null;
          ticket_nro: number | null;
          user_email: string | null;
          user_id: string | null;
          username: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json;
          entity: string;
          id?: string;
          ticket_id?: string | null;
          ticket_nro?: number | null;
          user_email?: string | null;
          user_id?: string | null;
          username?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json;
          entity?: string;
          id?: string;
          ticket_id?: string | null;
          ticket_nro?: number | null;
          user_email?: string | null;
          user_id?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      master_lists: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          list_key: string;
          sort_order: number;
          updated_at: string;
          value: Json;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          list_key: string;
          sort_order?: number;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          list_key?: string;
          sort_order?: number;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          status: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
          username?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      reportes_ap: {
        Row: {
          carnet_accidentado: string | null;
          celular: string | null;
          colaborador: string;
          created_at: string;
          created_by: string | null;
          departamento: string | null;
          descripcion: string | null;
          direccion: string | null;
          ejecutivo_celular: string | null;
          ejecutivo_nombre: string | null;
          fecha_siniestro: string | null;
          fecha_solicitud: string | null;
          hora_contacto: string | null;
          hubo_tripartita: string | null;
          id: string;
          intentos_llamada: string | null;
          nombre_accidentado: string | null;
          nro: number;
          observaciones: string | null;
          poliza: string | null;
          solicitante: string | null;
          updated_at: string;
        };
        Insert: {
          carnet_accidentado?: string | null;
          celular?: string | null;
          colaborador?: string;
          created_at?: string;
          created_by?: string | null;
          departamento?: string | null;
          descripcion?: string | null;
          direccion?: string | null;
          ejecutivo_celular?: string | null;
          ejecutivo_nombre?: string | null;
          fecha_siniestro?: string | null;
          fecha_solicitud?: string | null;
          hora_contacto?: string | null;
          hubo_tripartita?: string | null;
          id?: string;
          intentos_llamada?: string | null;
          nombre_accidentado?: string | null;
          nro?: number;
          observaciones?: string | null;
          poliza?: string | null;
          solicitante?: string | null;
          updated_at?: string;
        };
        Update: {
          carnet_accidentado?: string | null;
          celular?: string | null;
          colaborador?: string;
          created_at?: string;
          created_by?: string | null;
          departamento?: string | null;
          descripcion?: string | null;
          direccion?: string | null;
          ejecutivo_celular?: string | null;
          ejecutivo_nombre?: string | null;
          fecha_siniestro?: string | null;
          fecha_solicitud?: string | null;
          hora_contacto?: string | null;
          hubo_tripartita?: string | null;
          id?: string;
          intentos_llamada?: string | null;
          nombre_accidentado?: string | null;
          nro?: number;
          observaciones?: string | null;
          poliza?: string | null;
          solicitante?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reportes_cg: {
        Row: {
          asegurado: string | null;
          celular: string | null;
          colaborador: string;
          created_at: string;
          created_by: string | null;
          danos_personales: string | null;
          departamento: string | null;
          descripcion: string | null;
          direccion: string | null;
          ejecutivo_celular: string | null;
          ejecutivo_nombre: string | null;
          fecha_siniestro: string | null;
          fecha_solicitud: string | null;
          hora_contacto: string | null;
          hubo_tripartita: string | null;
          id: string;
          intentos_llamada: string | null;
          nro: number;
          observaciones: string | null;
          poliza: string | null;
          solicitante: string | null;
          updated_at: string;
        };
        Insert: {
          asegurado?: string | null;
          celular?: string | null;
          colaborador?: string;
          created_at?: string;
          created_by?: string | null;
          danos_personales?: string | null;
          departamento?: string | null;
          descripcion?: string | null;
          direccion?: string | null;
          ejecutivo_celular?: string | null;
          ejecutivo_nombre?: string | null;
          fecha_siniestro?: string | null;
          fecha_solicitud?: string | null;
          hora_contacto?: string | null;
          hubo_tripartita?: string | null;
          id?: string;
          intentos_llamada?: string | null;
          nro?: number;
          observaciones?: string | null;
          poliza?: string | null;
          solicitante?: string | null;
          updated_at?: string;
        };
        Update: {
          asegurado?: string | null;
          celular?: string | null;
          colaborador?: string;
          created_at?: string;
          created_by?: string | null;
          danos_personales?: string | null;
          departamento?: string | null;
          descripcion?: string | null;
          direccion?: string | null;
          ejecutivo_celular?: string | null;
          ejecutivo_nombre?: string | null;
          fecha_siniestro?: string | null;
          fecha_solicitud?: string | null;
          hora_contacto?: string | null;
          hubo_tripartita?: string | null;
          id?: string;
          intentos_llamada?: string | null;
          nro?: number;
          observaciones?: string | null;
          poliza?: string | null;
          solicitante?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          allowed: boolean;
          id: string;
          permission: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          allowed?: boolean;
          id?: string;
          permission: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          allowed?: boolean;
          id?: string;
          permission?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      ticket_attachments: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          mime: string;
          name: string;
          note_id: string | null;
          storage_path: string;
          ticket_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          mime?: string;
          name: string;
          note_id?: string | null;
          storage_path: string;
          ticket_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          mime?: string;
          name?: string;
          note_id?: string | null;
          storage_path?: string;
          ticket_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "ticket_notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_notes: {
        Row: {
          created_at: string;
          created_by: string | null;
          estado: string;
          fecha: string;
          id: string;
          nota: string;
          ticket_id: string;
          usuario: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          estado: string;
          fecha?: string;
          id?: string;
          nota?: string;
          ticket_id: string;
          usuario: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          estado?: string;
          fecha?: string;
          id?: string;
          nota?: string;
          ticket_id?: string;
          usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          celular: string | null;
          cerrado_por: string;
          contratante: string | null;
          created_at: string;
          created_by: string | null;
          departamento: string | null;
          estado: string;
          fecha_creacion: string;
          id: string;
          nro: number;
          poliza: string | null;
          registrado_por: string;
          severidad: string;
          solicitante: string;
          tipo: string;
          tipo_asistencia: string | null;
          updated_at: string;
        };
        Insert: {
          celular?: string | null;
          cerrado_por?: string;
          contratante?: string | null;
          created_at?: string;
          created_by?: string | null;
          departamento?: string | null;
          estado?: string;
          fecha_creacion?: string;
          id?: string;
          nro?: number;
          poliza?: string | null;
          registrado_por?: string;
          severidad?: string;
          solicitante: string;
          tipo: string;
          tipo_asistencia?: string | null;
          updated_at?: string;
        };
        Update: {
          celular?: string | null;
          cerrado_por?: string;
          contratante?: string | null;
          created_at?: string;
          created_by?: string | null;
          departamento?: string | null;
          estado?: string;
          fecha_creacion?: string;
          id?: string;
          nro?: number;
          poliza?: string | null;
          registrado_por?: string;
          severidad?: string;
          solicitante?: string;
          tipo?: string;
          tipo_asistencia?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_email: { Args: never; Returns: string };
      current_user_username: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      next_code: { Args: { _prefix: string }; Returns: number };
    };
    Enums: {
      app_role: "administrador" | "supervisor" | "operador" | "addiuva";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "supervisor", "operador", "addiuva"],
    },
  },
} as const;
