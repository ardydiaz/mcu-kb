ALTER TABLE documents
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER department,
  ADD KEY idx_documents_category (category_id),
  ADD CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
