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
      assinaturas: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plano: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plano: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plano?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversas_ia: {
        Row: {
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      historico_premium: {
        Row: {
          acao: string
          admin_id: string | null
          created_at: string
          id: string
          observacao: string | null
          premium_ate_antes: string | null
          premium_ate_depois: string | null
          user_id: string
          vitalicio_antes: boolean | null
          vitalicio_depois: boolean | null
        }
        Insert: {
          acao: string
          admin_id?: string | null
          created_at?: string
          id?: string
          observacao?: string | null
          premium_ate_antes?: string | null
          premium_ate_depois?: string | null
          user_id: string
          vitalicio_antes?: boolean | null
          vitalicio_depois?: boolean | null
        }
        Update: {
          acao?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          observacao?: string | null
          premium_ate_antes?: string | null
          premium_ate_depois?: string | null
          user_id?: string
          vitalicio_antes?: boolean | null
          vitalicio_depois?: boolean | null
        }
        Relationships: []
      }
      mensagens_ia: {
        Row: {
          content: string
          conversa_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversa_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversa_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_ia_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          criada_por: string | null
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          criada_por?: string | null
          id?: string
          lida?: boolean
          mensagem: string
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          criada_por?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          plano: string
          premium_ate: string | null
          premium_concedido_por: string | null
          premium_vitalicio: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          plano?: string
          premium_ate?: string | null
          premium_concedido_por?: string | null
          premium_vitalicio?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          plano?: string
          premium_ate?: string | null
          premium_concedido_por?: string | null
          premium_vitalicio?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      questoes: {
        Row: {
          alternativa_a: string
          alternativa_b: string
          alternativa_c: string
          alternativa_d: string
          alternativa_e: string | null
          correta: string
          created_at: string
          enunciado: string
          explicacao: string | null
          id: string
          materia: string | null
          ordem: number
          simulado_id: string
        }
        Insert: {
          alternativa_a: string
          alternativa_b: string
          alternativa_c: string
          alternativa_d: string
          alternativa_e?: string | null
          correta: string
          created_at?: string
          enunciado: string
          explicacao?: string | null
          id?: string
          materia?: string | null
          ordem: number
          simulado_id: string
        }
        Update: {
          alternativa_a?: string
          alternativa_b?: string
          alternativa_c?: string
          alternativa_d?: string
          alternativa_e?: string | null
          correta?: string
          created_at?: string
          enunciado?: string
          explicacao?: string | null
          id?: string
          materia?: string | null
          ordem?: number
          simulado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questoes_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes: {
        Row: {
          created_at: string
          feedback_geral: string | null
          id: string
          nota_c1: number | null
          nota_c2: number | null
          nota_c3: number | null
          nota_c4: number | null
          nota_c5: number | null
          nota_total: number | null
          status: string
          sugestoes: string | null
          tema: string
          texto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_geral?: string | null
          id?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          status?: string
          sugestoes?: string | null
          tema: string
          texto: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_geral?: string | null
          id?: string
          nota_c1?: number | null
          nota_c2?: number | null
          nota_c3?: number | null
          nota_c4?: number | null
          nota_c5?: number | null
          nota_total?: number | null
          status?: string
          sugestoes?: string | null
          tema?: string
          texto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      respostas_questao: {
        Row: {
          correta: boolean | null
          created_at: string
          id: string
          questao_id: string
          resposta: string | null
          tentativa_id: string
          user_id: string
        }
        Insert: {
          correta?: boolean | null
          created_at?: string
          id?: string
          questao_id: string
          resposta?: string | null
          tentativa_id: string
          user_id: string
        }
        Update: {
          correta?: boolean | null
          created_at?: string
          id?: string
          questao_id?: string
          resposta?: string | null
          tentativa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_questao_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_questao_tentativa_id_fkey"
            columns: ["tentativa_id"]
            isOneToOne: false
            referencedRelation: "tentativas_simulado"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          created_at: string
          descricao: string | null
          dificuldade: string
          duracao_minutos: number
          id: string
          materia: string | null
          publicado: boolean
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          dificuldade?: string
          duracao_minutos?: number
          id?: string
          materia?: string | null
          publicado?: boolean
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          dificuldade?: string
          duracao_minutos?: number
          id?: string
          materia?: string | null
          publicado?: boolean
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      tentativas_simulado: {
        Row: {
          acertos: number
          finalizado_em: string | null
          id: string
          iniciado_em: string
          pontuacao: number
          simulado_id: string
          status: string
          tempo_segundos: number | null
          total_questoes: number
          user_id: string
        }
        Insert: {
          acertos?: number
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          pontuacao?: number
          simulado_id: string
          status?: string
          tempo_segundos?: number | null
          total_questoes: number
          user_id: string
        }
        Update: {
          acertos?: number
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          pontuacao?: number
          simulado_id?: string
          status?: string
          tempo_segundos?: number | null
          total_questoes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_simulado_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
