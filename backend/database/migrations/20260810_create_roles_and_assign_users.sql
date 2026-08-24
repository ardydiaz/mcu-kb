-- Administrative roles use fixed IDs required by the application.
CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Full access to all knowledge-base administration features'),
  (2, 'admin', 'Access to standard knowledge-base administration features'),
  (3, 'student', 'Default authenticated knowledge-base access without admin privileges')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

-- Assign roles explicitly after migration, for example:
-- UPDATE users SET role_id = 1 WHERE email = 'superadmin@mcu.edu.ph';
-- UPDATE users SET role_id = 2 WHERE email = 'admin@mcu.edu.ph';
