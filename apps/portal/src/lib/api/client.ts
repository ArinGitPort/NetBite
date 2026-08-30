import { supabase } from "@/lib/supabase";

export function getPortalClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
