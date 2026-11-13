// Cole aqui os dados do seu projeto Supabase.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://lvjqtnjakchfrtgsmwks.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AAw8ANVaoONx6zfPZlUV_A_qU3Rl437";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
