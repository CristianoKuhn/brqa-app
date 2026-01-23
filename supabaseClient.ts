
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lywhwfhxyggqrbyccdwj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jOcrmu2ZjJ4itBjOxr-ruA_vj2vlhp8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
