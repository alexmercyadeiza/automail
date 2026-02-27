-- 002_automation_cron.sql
-- pg_cron scheduling for automation enrollment processing.
--
-- NOTE: pg_cron must be enabled in your Supabase project settings
-- (Database → Extensions → pg_cron). It is enabled by default on
-- paid plans. On the free tier you may need to enable it manually.

-- ==========================================================================
-- Enable pg_cron
-- ==========================================================================
create extension if not exists pg_cron with schema extensions;

-- ==========================================================================
-- Processing function
-- ==========================================================================
-- This function processes automation enrollments that are due.
-- For email sending, it delegates to an Edge Function via pg_net.
-- For delays and simple state transitions, it handles them directly.
-- ==========================================================================

create or replace function process_automation_enrollments()
returns void
language plpgsql
as $$
declare
  rec record;
  node jsonb;
  nodes jsonb;
  next_node_id text;
  node_index int;
  delay_interval interval;
begin
  for rec in
    select
      e.id as enrollment_id,
      e.automation_id,
      e.customer_id,
      e.current_node_id,
      a.nodes as automation_nodes
    from automation_enrollments e
    join automation_campaigns a on a.id = e.automation_id
    where e.status = 'active'
      and e.next_process_at <= now()
    order by e.next_process_at
    limit 100  -- process in batches
    for update of e skip locked
  loop
    nodes := rec.automation_nodes;

    -- Find the current node in the nodes array
    node := null;
    node_index := null;
    for i in 0 .. jsonb_array_length(nodes) - 1 loop
      if nodes->i->>'id' = rec.current_node_id then
        node := nodes->i;
        node_index := i;
        exit;
      end if;
    end loop;

    -- If node not found, mark as exited
    if node is null then
      update automation_enrollments
        set status = 'exited', updated_at = now()
        where id = rec.enrollment_id;

      insert into automation_logs (enrollment_id, node_id, node_type, action)
        values (rec.enrollment_id, rec.current_node_id, 'unknown', 'node_not_found_exited');
      continue;
    end if;

    -- Determine next node (next element in array, or null if last)
    if node_index + 1 < jsonb_array_length(nodes) then
      next_node_id := nodes->(node_index + 1)->>'id';
    else
      next_node_id := null;
    end if;

    -- Process based on node type
    case node->>'type'
      when 'send_email' then
        -- Log the send action; actual sending is handled by the Edge Function
        -- which polls automation_logs for pending send_email actions,
        -- or by a separate cron that calls the Edge Function.
        insert into automation_logs (enrollment_id, node_id, node_type, action)
          values (rec.enrollment_id, rec.current_node_id, 'send_email', 'email_queued');

        -- Advance to next node
        if next_node_id is not null then
          update automation_enrollments
            set current_node_id = next_node_id,
                next_process_at = now(),
                updated_at = now()
            where id = rec.enrollment_id;
        else
          update automation_enrollments
            set status = 'completed', updated_at = now()
            where id = rec.enrollment_id;
        end if;

      when 'time_delay' then
        -- Calculate delay interval from node data
        delay_interval := make_interval(
          days  => coalesce((node->'data'->>'days')::int, 0),
          hours => coalesce((node->'data'->>'hours')::int, 0),
          mins  => coalesce((node->'data'->>'minutes')::int, 0)
        );

        insert into automation_logs (enrollment_id, node_id, node_type, action)
          values (rec.enrollment_id, rec.current_node_id, 'time_delay',
                  'delay_set_' || delay_interval::text);

        -- Advance to next node with delayed processing time
        if next_node_id is not null then
          update automation_enrollments
            set current_node_id = next_node_id,
                next_process_at = now() + delay_interval,
                updated_at = now()
            where id = rec.enrollment_id;
        else
          update automation_enrollments
            set status = 'completed', updated_at = now()
            where id = rec.enrollment_id;
        end if;

      when 'exit' then
        update automation_enrollments
          set status = 'exited', updated_at = now()
          where id = rec.enrollment_id;

        insert into automation_logs (enrollment_id, node_id, node_type, action)
          values (rec.enrollment_id, rec.current_node_id, 'exit', 'workflow_exited');

      else
        -- Unknown node type; log and skip to next
        insert into automation_logs (enrollment_id, node_id, node_type, action)
          values (rec.enrollment_id, rec.current_node_id, coalesce(node->>'type', 'unknown'), 'skipped_unknown_type');

        if next_node_id is not null then
          update automation_enrollments
            set current_node_id = next_node_id,
                next_process_at = now(),
                updated_at = now()
            where id = rec.enrollment_id;
        else
          update automation_enrollments
            set status = 'completed', updated_at = now()
            where id = rec.enrollment_id;
        end if;
    end case;
  end loop;
end;
$$;

-- ==========================================================================
-- Schedule: run every minute
-- ==========================================================================
select cron.schedule(
  'process-automations',
  '* * * * *',
  $$select process_automation_enrollments()$$
);
