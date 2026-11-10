import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adxhdrnxbyzurjbhtogw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeGhkcm54Ynl6dXJqYmh0b2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDI3ODIsImV4cCI6MjEwOTgxODc4Mn0.BVj1uEZwZ-FbPNAl4RbO5lwy5euFWblLBHMIbMmPV_I';

export const supabase = createClient(supabaseUrl, supabaseKey);
