-- Geofence settings for businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS geofence_enabled   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_lat       float8,
  ADD COLUMN IF NOT EXISTS geofence_lng       float8,
  ADD COLUMN IF NOT EXISTS geofence_radius_m  integer     NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS geofence_pin       varchar(6);

-- Track whether a timelog entry used the PIN override instead of GPS
ALTER TABLE timelogs
  ADD COLUMN IF NOT EXISTS via_pin boolean NOT NULL DEFAULT false;
