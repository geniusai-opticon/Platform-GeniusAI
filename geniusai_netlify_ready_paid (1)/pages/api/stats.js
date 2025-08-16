
import { supabase } from "../../lib/supabaseServer";
export default async function handler(req,res){
  const goal = Number(process.env.BETA_GOAL || 1000);
  const { count, error } = await supabase.from('registrations').select('*',{ head:true, count:'exact' });
  if(error) return res.status(500).json({error:error.message});
  const total = count || 0;
  res.json({ total, goal, remaining: Math.max(0, goal - total) });
}
