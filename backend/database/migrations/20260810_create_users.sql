CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  microsoft_id VARCHAR(190) NULL,
  email VARCHAR(190) NOT NULL,
  fullname VARCHAR(190) NOT NULL,
  role_id TINYINT UNSIGNED NULL,
  department VARCHAR(150) NULL,
  status ENUM('pending', 'active', 'inactive') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_microsoft_id (microsoft_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  KEY idx_users_department (department),
  KEY idx_users_status (status),
  CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
