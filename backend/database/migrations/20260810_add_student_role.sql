INSERT INTO roles (id, name, description) VALUES
  (3, 'student', 'Default authenticated knowledge-base access without admin privileges')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);
