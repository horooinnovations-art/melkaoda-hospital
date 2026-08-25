-- Add an optional department category reference to doctor profiles.

ALTER TABLE doctors
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER department_id;
