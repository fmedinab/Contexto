// config/supabase.js
// Cliente Supabase singleton.
// Se inicializa una sola vez y se reutiliza en toda la aplicación.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import Env from './env.js';

let supabaseInstance = null;

export function getSupabaseClient() {
    if (!supabaseInstance) {
        supabaseInstance = createClient(Env.supabase.url, Env.supabase.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'pkce'
            }
        });
    }
    return supabaseInstance;
}

export const supabase = getSupabaseClient();
