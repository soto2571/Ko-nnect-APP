-- Push notification token per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;

-- Owner notification preferences on the business
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS "notifyClockIn"   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "notifyBreak"     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "notifyClockOut"  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "notifyLate"      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "notifyNoShow"    BOOLEAN NOT NULL DEFAULT TRUE;

-- Employee notification opt-in preferences
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "notifyShiftReminder" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "notifyClockOutReminder" BOOLEAN NOT NULL DEFAULT FALSE;

-- Flag to avoid sending repeated no-show notifications for the same shift
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "noShowNotified" BOOLEAN NOT NULL DEFAULT FALSE;
