// src/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// For normal user operations (login, magic links)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For admin operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
