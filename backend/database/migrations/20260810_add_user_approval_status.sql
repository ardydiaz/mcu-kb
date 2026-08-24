ALTER TABLE users
  MODIFY COLUMN status ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending';

-- Existing accounts keep their current status. New Microsoft accounts wait for approval.
