
import { supabase } from "../../lib/supabaseServer";
export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  const { name, email, interest, spending, ref } = req.body || {};
  if(!name || !email) return res.status(400).json({error:'missing_fields'});
  const { error } = await supabase.from('registrations').insert([{ name, email, interest, spending, referral: ref || null }]);
  if(error) return res.status(500).json({error:error.message});
  res.json({ ok:true });
}
