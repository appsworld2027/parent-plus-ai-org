-- Controller-owned, executed with the unprivileged client login.
-- Every failed condition raises a real exception; candidate SQL never owns this script.
CREATE TEMP TABLE oracle_results (check_id text PRIMARY KEY);
DO $check$
DECLARE r jsonb; v integer; t text;
BEGIN
  PERFORM set_config('pilot.tenant','legacy-a',false);
  SELECT count(*) INTO v FROM pilot.reminders;
  IF v <> 1 OR NOT EXISTS(SELECT 1 FROM pilot.reminders WHERE id='old' AND title='Legacy A' AND version=1)
    THEN RAISE EXCEPTION 'DB01 legacy preservation / list isolation'; END IF;
  INSERT INTO oracle_results VALUES ('DB01');
  PERFORM set_config('pilot.tenant','legacy-b',false);
  IF NOT EXISTS(SELECT 1 FROM pilot.reminders WHERE id='old' AND title='Legacy B' AND version=1)
    OR EXISTS(SELECT 1 FROM pilot.reminders WHERE tenant_id='legacy-a')
    THEN RAISE EXCEPTION 'DB02 equal IDs across tenants'; END IF;
  INSERT INTO oracle_results VALUES ('DB02');
  PERFORM set_config('pilot.tenant','',false);
  IF EXISTS(SELECT 1 FROM pilot.reminders) THEN RAISE EXCEPTION 'DB03 missing tenant visible'; END IF;
  r:=pilot.save_reminder('legacy-a','x','Unknown',0,'request');
  IF r IS DISTINCT FROM '{"ok":false,"code":"invalid"}'::jsonb THEN RAISE EXCEPTION 'DB03 missing tenant write: %',r; END IF;
  INSERT INTO oracle_results VALUES ('DB03');
  PERFORM set_config('pilot.tenant','A',false);
  r:=pilot.save_reminder('B','r1','Wrong',0,'same');
  IF r IS DISTINCT FROM '{"ok":false,"code":"invalid"}'::jsonb THEN RAISE EXCEPTION 'DB04 cross-tenant function write: %',r; END IF;
  BEGIN
    INSERT INTO pilot.reminders VALUES ('B','direct','Wrong',1);
    RAISE EXCEPTION 'DB04 direct cross-tenant insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO oracle_results VALUES ('DB04');
  r:=pilot.save_reminder('A','r1','  Alpha  ',0,'same');
  IF r IS DISTINCT FROM '{"ok":true,"record":{"id":"r1","title":"Alpha","version":1}}'::jsonb
    THEN RAISE EXCEPTION 'DB05 create/trim: %',r; END IF;
  IF NOT EXISTS(SELECT 1 FROM pilot.reminders WHERE tenant_id='A' AND id='r1' AND title='Alpha' AND version=1)
    THEN RAISE EXCEPTION 'DB05 no stored row'; END IF;
  INSERT INTO oracle_results VALUES ('DB05');
  r:=pilot.save_reminder('A','r1','Alpha',0,'same');
  IF r IS DISTINCT FROM '{"ok":true,"record":{"id":"r1","title":"Alpha","version":1}}'::jsonb
    THEN RAISE EXCEPTION 'DB06 replay: %',r; END IF;
  SELECT version INTO v FROM pilot.reminders WHERE id='r1';
  IF v IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'DB06 duplicate effect'; END IF;
  INSERT INTO oracle_results VALUES ('DB06');
  r:=pilot.save_reminder('A','r1','Changed',0,'same');
  IF r IS DISTINCT FROM '{"ok":false,"code":"conflict"}'::jsonb THEN RAISE EXCEPTION 'DB07 changed request: %',r; END IF;
  INSERT INTO oracle_results VALUES ('DB07');
  r:=pilot.save_reminder('A','r1','Beta',1,'update');
  IF r IS DISTINCT FROM '{"ok":true,"record":{"id":"r1","title":"Beta","version":2}}'::jsonb
    THEN RAISE EXCEPTION 'DB08 update: %',r; END IF;
  r:=pilot.save_reminder('A','r1','Stale',1,'stale');
  IF r IS DISTINCT FROM '{"ok":false,"code":"stale"}'::jsonb THEN RAISE EXCEPTION 'DB08 stale: %',r; END IF;
  SELECT title,version INTO t,v FROM pilot.reminders WHERE id='r1';
  IF t IS DISTINCT FROM 'Beta' OR v IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'DB08 stale side effect'; END IF;
  INSERT INTO oracle_results VALUES ('DB08');
  r:=pilot.save_reminder('A','r1','Alpha',0,'same');
  IF r IS DISTINCT FROM '{"ok":true,"record":{"id":"r1","title":"Alpha","version":1}}'::jsonb
    THEN RAISE EXCEPTION 'DB09 original replay after update: %',r; END IF;
  INSERT INTO oracle_results VALUES ('DB09');
  r:=pilot.save_reminder('A','x',repeat('x',81),0,'invalid1');
  IF r IS DISTINCT FROM '{"ok":false,"code":"invalid"}'::jsonb THEN RAISE EXCEPTION 'DB10 title bound: %',r; END IF;
  r:=pilot.save_reminder('A','x',' ',0,'invalid2');
  IF r IS DISTINCT FROM '{"ok":false,"code":"invalid"}'::jsonb THEN RAISE EXCEPTION 'DB10 empty title: %',r; END IF;
  r:=pilot.save_reminder('A','x','X',-1,'invalid3');
  IF r IS DISTINCT FROM '{"ok":false,"code":"invalid"}'::jsonb THEN RAISE EXCEPTION 'DB10 invalid version: %',r; END IF;
  IF EXISTS(SELECT 1 FROM pilot.reminders WHERE id='x') THEN RAISE EXCEPTION 'DB10 invalid writes'; END IF;
  INSERT INTO oracle_results VALUES ('DB10');
  PERFORM set_config('pilot.tenant','B',false);
  r:=pilot.save_reminder('B','r1','Other',0,'same');
  IF r IS DISTINCT FROM '{"ok":true,"record":{"id":"r1","title":"Other","version":1}}'::jsonb
    THEN RAISE EXCEPTION 'DB11 tenant-scoped request key: %',r; END IF;
  IF EXISTS(SELECT 1 FROM pilot.reminders WHERE tenant_id='A') THEN RAISE EXCEPTION 'DB11 cross-tenant read'; END IF;
  INSERT INTO oracle_results VALUES ('DB11');
  -- Direct path must not allow touching another tenant, even with an UPDATE grant.
  BEGIN
    UPDATE pilot.reminders SET title='Intrusion' WHERE tenant_id='A' AND id='r1';
    GET DIAGNOSTICS v=ROW_COUNT;
    IF v<>0 THEN RAISE EXCEPTION 'DB12 cross-tenant update'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('pilot.tenant','A',false);
  IF NOT EXISTS(SELECT 1 FROM pilot.reminders WHERE id='r1' AND title='Beta' AND version=2)
    THEN RAISE EXCEPTION 'DB12 cross-tenant persisted mutation'; END IF;
  INSERT INTO oracle_results VALUES ('DB12');
END
$check$;
SELECT 'LOCKED:'||check_id FROM oracle_results ORDER BY check_id;
