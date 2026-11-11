ALTER TABLE sessions ADD COLUMN timer_mode TEXT NOT NULL DEFAULT 'stopwatch' CHECK(timer_mode IN ('stopwatch','pomodoro','countdown'));
ALTER TABLE sessions ADD COLUMN target_ms INTEGER CHECK(target_ms IS NULL OR target_ms > 0);
CREATE TABLE timer_runtime (id INTEGER PRIMARY KEY CHECK(id=1), state_json TEXT NOT NULL);
INSERT INTO timer_runtime VALUES(1,'{"cycle":0,"break":null,"notice":null}');
INSERT INTO settings VALUES('timerMode','stopwatch'),('focusMinutes','25'),('shortBreakMinutes','5'),('longBreakMinutes','15'),('countdownMinutes','45');
UPDATE settings SET value='true' WHERE key='alwaysOnTop';
PRAGMA user_version = 3;
