import { json, preflight } from '../_shared/http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const { data: { user }, error: authError } = await userClient(request).auth.getUser();
  if (authError || !user) return json({ error: 'Authentication required.' }, 401);

  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'Account deletion could not be completed.' }, 500);
  return json({ deleted: true });
});
