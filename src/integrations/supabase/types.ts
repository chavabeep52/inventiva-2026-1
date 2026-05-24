export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          accion: string
          created_at: string
          descripcion: string | null
          id: string
          metadata: Json | null
          registro_id: string | null
          tabla_afectada: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          descripcion?: string | null
          id?: string
          metadata?: Json | null
          registro_id?: string | null
          tabla_afectada?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          metadata?: Json | null
          registro_id?: string | null
          tabla_afectada?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          dia_activo_id: string | null
          id: string
          nombre_evento: string
          periodo: string
          titulo_pestana: string
          updated_at: string
          votacion_abierta: boolean
        }
        Insert: {
          dia_activo_id?: string | null
          id?: string
          nombre_evento?: string
          periodo?: string
          titulo_pestana?: string
          updated_at?: string
          votacion_abierta?: boolean
        }
        Update: {
          dia_activo_id?: string | null
          id?: string
          nombre_evento?: string
          periodo?: string
          titulo_pestana?: string
          updated_at?: string
          votacion_abierta?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_dia_activo_id_fkey"
            columns: ["dia_activo_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
        ]
      }
      event_days: {
        Row: {
          created_at: string
          fecha: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          nombre: string
          orden: number
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      pregrados: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          correo_representante: string
          creado_por: string | null
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["proyecto_estado"]
          event_day_id: string
          id: string
          nombre: string
          numero_integrantes: number
          pregrado_id: string
          telefono_representante: string
          updated_at: string
        }
        Insert: {
          correo_representante: string
          creado_por?: string | null
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["proyecto_estado"]
          event_day_id: string
          id?: string
          nombre: string
          numero_integrantes: number
          pregrado_id: string
          telefono_representante: string
          updated_at?: string
        }
        Update: {
          correo_representante?: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["proyecto_estado"]
          event_day_id?: string
          id?: string
          nombre?: string
          numero_integrantes?: number
          pregrado_id?: string
          telefono_representante?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_pregrado_id_fkey"
            columns: ["pregrado_id"]
            isOneToOne: false
            referencedRelation: "pregrados"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votos: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["voto_estado"]
          event_day_id: string
          id: string
          nombre_votante: string
          nombre_votante_norm: string | null
          observacion: string | null
          pregrado_id: string
          proyecto_id: string
          registrado_por: string | null
          tipo_votante: Database["public"]["Enums"]["tipo_votante"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["voto_estado"]
          event_day_id: string
          id?: string
          nombre_votante: string
          nombre_votante_norm?: string | null
          observacion?: string | null
          pregrado_id: string
          proyecto_id: string
          registrado_por?: string | null
          tipo_votante: Database["public"]["Enums"]["tipo_votante"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["voto_estado"]
          event_day_id?: string
          id?: string
          nombre_votante?: string
          nombre_votante_norm?: string | null
          observacion?: string | null
          pregrado_id?: string
          proyecto_id?: string
          registrado_por?: string | null
          tipo_votante?: Database["public"]["Enums"]["tipo_votante"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_pregrado_id_fkey"
            columns: ["pregrado_id"]
            isOneToOne: false
            referencedRelation: "pregrados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      proyectos_publicos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["proyecto_estado"] | null
          event_day_id: string | null
          id: string | null
          nombre: string | null
          numero_integrantes: number | null
          pregrado_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["proyecto_estado"] | null
          event_day_id?: string | null
          id?: string | null
          nombre?: string | null
          numero_integrantes?: number | null
          pregrado_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["proyecto_estado"] | null
          event_day_id?: string | null
          id?: string | null
          nombre?: string | null
          numero_integrantes?: number | null
          pregrado_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_pregrado_id_fkey"
            columns: ["pregrado_id"]
            isOneToOne: false
            referencedRelation: "pregrados"
            referencedColumns: ["id"]
          },
        ]
      }
      votos_publicos: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["voto_estado"] | null
          event_day_id: string | null
          id: string | null
          pregrado_id: string | null
          proyecto_id: string | null
          tipo_votante: Database["public"]["Enums"]["tipo_votante"] | null
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["voto_estado"] | null
          event_day_id?: string | null
          id?: string | null
          pregrado_id?: string | null
          proyecto_id?: string | null
          tipo_votante?: Database["public"]["Enums"]["tipo_votante"] | null
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["voto_estado"] | null
          event_day_id?: string | null
          id?: string | null
          pregrado_id?: string | null
          proyecto_id?: string | null
          tipo_votante?: Database["public"]["Enums"]["tipo_votante"] | null
        }
        Relationships: [
          {
            foreignKeyName: "votos_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_pregrado_id_fkey"
            columns: ["pregrado_id"]
            isOneToOne: false
            referencedRelation: "pregrados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_vote: { Args: { _user_id: string }; Returns: boolean }
      check_voter_duplicate: {
        Args: { _event_day_id: string; _nombre_norm: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_organizer_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "operator" | "organizer" | "admin" | "public_viewer"
      proyecto_estado: "habilitado" | "deshabilitado"
      tipo_votante: "popular" | "profesor" | "jurado"
      voto_estado: "valido" | "anulado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operator", "organizer", "admin", "public_viewer"],
      proyecto_estado: ["habilitado", "deshabilitado"],
      tipo_votante: ["popular", "profesor", "jurado"],
      voto_estado: ["valido", "anulado"],
    },
  },
} as const
