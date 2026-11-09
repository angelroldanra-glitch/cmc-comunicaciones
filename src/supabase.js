import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adxhdrnxbyzurjbhtogw.supabase.co';
const supabaseKey = 'sb_publishable_vDpVpKoRm-p8kxecFbIISA_W_8YQYCN';

export const supabase = createClient(supabaseUrl, supabaseKey);
