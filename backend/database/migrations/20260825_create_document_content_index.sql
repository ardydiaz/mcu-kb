CREATE TABLE IF NOT EXISTS document_processing_jobs (
  id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  document_version_id CHAR(36) NOT NULL,
  status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  stage VARCHAR(50) NOT NULL DEFAULT 'queued',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_processing_version (document_version_id),
  KEY idx_processing_status (status,created_at),
  CONSTRAINT fk_processing_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_processing_version FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_chunks (
  id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  document_version_id CHAR(36) NOT NULL,
  chunk_index INT UNSIGNED NOT NULL,
  content MEDIUMTEXT NOT NULL,
  page_number INT UNSIGNED NULL,
  sheet_name VARCHAR(190) NULL,
  cell_range VARCHAR(50) NULL,
  token_count INT UNSIGNED NOT NULL DEFAULT 0,
  checksum CHAR(64) NOT NULL,
  embedding LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_document_chunk (document_version_id,chunk_index),
  KEY idx_chunks_document (document_id,document_version_id),
  FULLTEXT KEY ft_chunks_content (content),
  CONSTRAINT fk_chunks_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_chunks_version FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
