CREATE ROLE pilot_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE pilot_client LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA pilot AUTHORIZATION pilot_owner;
SET ROLE pilot_owner;
CREATE TABLE pilot.reminders (
  tenant_id text NOT NULL,
  id text NOT NULL,
  title text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id,id)
);
INSERT INTO pilot.reminders VALUES ('legacy-a','old','Legacy A',1),('legacy-b','old','Legacy B',1);
RESET ROLE;
