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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      diet_presets: {
        Row: {
          carbs_per_kg: number | null
          created_at: string
          fat_per_kg: number | null
          id: string
          name: string
          protein_per_kg: number | null
          tdee_multiplier: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_per_kg?: number | null
          created_at?: string
          fat_per_kg?: number | null
          id?: string
          name: string
          protein_per_kg?: number | null
          tdee_multiplier?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_per_kg?: number | null
          created_at?: string
          fat_per_kg?: number | null
          id?: string
          name?: string
          protein_per_kg?: number | null
          tdee_multiplier?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          brand: string | null
          calories_per_serving: number
          carbs_per_serving: number
          category: string | null
          created_at: string
          fat_per_serving: number
          fiber_per_serving: number
          id: string
          name: string
          protein_per_serving: number
          serving_description: string | null
          serving_grams: number
          sodium_per_serving: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          calories_per_serving?: number
          carbs_per_serving?: number
          category?: string | null
          created_at?: string
          fat_per_serving?: number
          fiber_per_serving?: number
          id?: string
          name: string
          protein_per_serving?: number
          serving_description?: string | null
          serving_grams?: number
          sodium_per_serving?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          calories_per_serving?: number
          carbs_per_serving?: number
          category?: string | null
          created_at?: string
          fat_per_serving?: number
          fiber_per_serving?: number
          id?: string
          name?: string
          protein_per_serving?: number
          serving_description?: string | null
          serving_grams?: number
          sodium_per_serving?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          custom_calories: number
          custom_carbs: number
          custom_fat: number
          custom_protein: number
          day_of_week: string
          id: string
          ingredients_json: Json | null
          meal_slot: string
          recipe_id: string | null
          recipe_name: string
          serving_multiplier: number
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          custom_calories?: number
          custom_carbs?: number
          custom_fat?: number
          custom_protein?: number
          day_of_week: string
          id?: string
          ingredients_json?: Json | null
          meal_slot: string
          recipe_id?: string | null
          recipe_name: string
          serving_multiplier?: number
          updated_at?: string
          user_id: string
          week_start_date?: string
        }
        Update: {
          created_at?: string
          custom_calories?: number
          custom_carbs?: number
          custom_fat?: number
          custom_protein?: number
          day_of_week?: string
          id?: string
          ingredients_json?: Json | null
          meal_slot?: string
          recipe_id?: string | null
          recipe_name?: string
          serving_multiplier?: number
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          name: string
          recipe_id: string
          serving_multiplier: number
          unit: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          name: string
          recipe_id: string
          serving_multiplier?: number
          unit?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          name?: string
          recipe_id?: string
          serving_multiplier?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          id: string
          recipe_id: string
          tag_name: string
          user_id: string
        }
        Insert: {
          id?: string
          recipe_id: string
          tag_name: string
          user_id: string
        }
        Update: {
          id?: string
          recipe_id?: string
          tag_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image: string | null
          instructions: string | null
          link: string | null
          name: string
          notes: string | null
          servings: number
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          instructions?: string | null
          link?: string | null
          name: string
          notes?: string | null
          servings?: number
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          instructions?: string | null
          link?: string | null
          name?: string
          notes?: string | null
          servings?: number
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_targets: {
        Row: {
          carbs: number
          created_at: string
          daily_calories: number
          fat: number
          id: string
          preset_id: string | null
          protein: number
          strategy: string
          tdee: number
          updated_at: string
          user_id: string
          week_start_date: string
          weight_kg: number
        }
        Insert: {
          carbs?: number
          created_at?: string
          daily_calories?: number
          fat?: number
          id?: string
          preset_id?: string | null
          protein?: number
          strategy?: string
          tdee?: number
          updated_at?: string
          user_id: string
          week_start_date?: string
          weight_kg?: number
        }
        Update: {
          carbs?: number
          created_at?: string
          daily_calories?: number
          fat?: number
          id?: string
          preset_id?: string | null
          protein?: number
          strategy?: string
          tdee?: number
          updated_at?: string
          user_id?: string
          week_start_date?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_targets_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "diet_presets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
