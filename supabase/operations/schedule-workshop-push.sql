-- Run after deploying 202610110001 and the workshop-push Edge Function.
-- Create Vault secrets named project_url and workshop_push_cron_secret first.
-- Set WORKSHOP_PUSH_CRON_SECRET to the same secret on the Edge Function and
-- WORKSHOP_PUSH_DELIVERY_ENABLED=true only after the test build has a token;
-- delivery additionally requires WORKSHOP_PUSH_CANARY_CLASS_ID.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'project_url') or
     not exists (select 1 from vault.decrypted_secrets where name = 'workshop_push_cron_secret') then
    raise exception 'Configure project_url and workshop_push_cron_secret in Vault before scheduling.';
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'workshop-push-every-five-minutes') then
    perform cron.schedule(
      'workshop-push-every-five-minutes',
      '*/5 * * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/workshop-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'workshop_push_cron_secret')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;
end;
$$;
