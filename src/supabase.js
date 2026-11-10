import { createClient } from '@supabase/supabase-js';

// 1. URL limpia (Sin el /rest/v1/ al final)
const supabaseUrl = 'https://adxhdrnxbyzurjbhtogw.supabase.co';

// 2. Usamos tu llave publishable (pública), nunca la secret.
const supabaseKey = 'sb_publishable_vDpVpKoRm-p8kxecFbIISA_W_8YQYCN';

export const supabase = createClient(supabaseUrl, supabaseKey);
