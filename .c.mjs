import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const url='https://ddxrxkavvzwdofiehejt.supabase.co', key='sb_publishable_MLPGjdm461v16TbqyChxBw_JTAywvyG';
const [pc]=fs.readFileSync('/home/claude/app-config/test-passwords.txt','utf8').trim().split('\n');
const c=createClient(url,key,{auth:{persistSession:false}}); await c.auth.signInWithPassword({email:'test-coach@rendimo.app',password:pc});
const id=(await c.auth.getUser()).data.user.id;
for (const t of ['players','programs','tasks','exercises']) { const r=await c.from(t).delete().eq('coach_id',id); console.log('deleted',t,r.error?.message||'ok'); }
await c.from('coaches').update({brand_name:'Mi marca',brand_short:null,color:'#d9480f',logo:null}).eq('id',id);
