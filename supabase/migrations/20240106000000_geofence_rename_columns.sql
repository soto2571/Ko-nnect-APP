-- Rename geofence columns to match the camelCase convention used throughout the schema
ALTER TABLE businesses
  RENAME COLUMN geofence_enabled  TO "geofenceEnabled";
ALTER TABLE businesses
  RENAME COLUMN geofence_lat      TO "geofenceLat";
ALTER TABLE businesses
  RENAME COLUMN geofence_lng      TO "geofenceLng";
ALTER TABLE businesses
  RENAME COLUMN geofence_radius_m TO "geofenceRadiusM";
ALTER TABLE businesses
  RENAME COLUMN geofence_pin      TO "geofencePin";

ALTER TABLE timelogs
  RENAME COLUMN via_pin TO "viaPin";
