CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(150) NOT NULL,
  description TEXT NULL,
  tags LONGTEXT NULL,
  visibility ENUM('public','internal','restricted') NOT NULL DEFAULT 'internal',
  status ENUM('pending','published','rejected','archived') NOT NULL DEFAULT 'pending',
  uploaded_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_department (department),
  KEY idx_documents_visibility_status (visibility,status),
  KEY idx_documents_uploaded_by (uploaded_by),
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_documents_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_versions (
  id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  version_number INT UNSIGNED NOT NULL DEFAULT 1,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(190) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_document_version (document_id,version_number),
  UNIQUE KEY uq_document_stored_name (stored_name),
  CONSTRAINT fk_versions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_versions_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id CHAR(36) NOT NULL,
  principal_type ENUM('role','department') NOT NULL,
  principal_value VARCHAR(150) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT TRUE,
  can_download BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_document_principal (document_id,principal_type,principal_value),
  KEY idx_permissions_lookup (principal_type,principal_value),
  CONSTRAINT fk_permissions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id CHAR(36) NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL,
  metadata LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_document_audit (document_id,created_at),
  CONSTRAINT fk_document_audit_document FOREIGN KEY (document_id) REFERENCES documents(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT fk_document_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
