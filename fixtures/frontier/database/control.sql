-- Trusted clean reference. Not a model artifact.
ALTER TABLE pilot.reminders ADD CONSTRAINT valid_reminder CHECK
 (length(btrim(tenant_id))>0 AND length(btrim(id))>0 AND title=btrim(title) AND length(title) BETWEEN 1 AND 80 AND version>=1);
ALTER TABLE pilot.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot.reminders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_reminders ON pilot.reminders
 USING (tenant_id=nullif(current_setting('pilot.tenant',true),''))
 WITH CHECK (tenant_id=nullif(current_setting('pilot.tenant',true),''));
CREATE TABLE pilot.requests (
 tenant_id text NOT NULL, request_id text NOT NULL, reminder_id text NOT NULL, title text NOT NULL,
 expected_version integer NOT NULL, result jsonb NOT NULL, PRIMARY KEY (tenant_id,request_id)
);
ALTER TABLE pilot.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot.requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_requests ON pilot.requests
 USING (tenant_id=nullif(current_setting('pilot.tenant',true),''))
 WITH CHECK (tenant_id=nullif(current_setting('pilot.tenant',true),''));
CREATE FUNCTION pilot.save_reminder(p_tenant text,p_id text,p_title text,p_expected integer,p_request text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pilot AS $code$
DECLARE old_record pilot.requests%ROWTYPE; current_version integer; clean_title text:=btrim(p_title); result_value jsonb;
BEGIN
 IF p_tenant IS NULL OR btrim(p_tenant)='' OR p_tenant IS DISTINCT FROM nullif(current_setting('pilot.tenant',true),'')
 OR p_id IS NULL OR btrim(p_id)='' OR p_request IS NULL OR btrim(p_request)=''
 OR clean_title IS NULL OR length(clean_title) NOT BETWEEN 1 AND 80
 OR p_expected IS NULL OR p_expected<0
 THEN RETURN '{"ok":false,"code":"invalid"}'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant,0));
 SELECT * INTO old_record FROM pilot.requests WHERE tenant_id=p_tenant AND request_id=p_request;
 IF FOUND THEN
   IF old_record.reminder_id=p_id AND old_record.title=clean_title AND old_record.expected_version=p_expected
   THEN RETURN old_record.result; END IF;
   RETURN '{"ok":false,"code":"conflict"}';
 END IF;
 SELECT version INTO current_version FROM pilot.reminders WHERE tenant_id=p_tenant AND id=p_id;
 IF coalesce(current_version,0)<>p_expected THEN RETURN '{"ok":false,"code":"stale"}'; END IF;
 INSERT INTO pilot.reminders VALUES (p_tenant,p_id,clean_title,p_expected+1)
 ON CONFLICT(tenant_id,id) DO UPDATE SET title=excluded.title,version=excluded.version;
 result_value:=jsonb_build_object('ok',true,'record',jsonb_build_object('id',p_id,'title',clean_title,'version',p_expected+1));
 INSERT INTO pilot.requests VALUES(p_tenant,p_request,p_id,clean_title,p_expected,result_value);
 RETURN result_value;
END
$code$;
REVOKE ALL ON FUNCTION pilot.save_reminder(text,text,text,integer,text) FROM PUBLIC;
GRANT USAGE ON SCHEMA pilot TO pilot_client;
GRANT SELECT ON pilot.reminders TO pilot_client;
GRANT EXECUTE ON FUNCTION pilot.save_reminder(text,text,text,integer,text) TO pilot_client;
