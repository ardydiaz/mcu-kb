ALTER TABLE documents ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER department;
UPDATE documents d JOIN departments dep ON LOWER(dep.name)=LOWER(d.department) AND dep.deleted_at IS NULL SET d.department_id=dep.id WHERE d.department_id IS NULL;
ALTER TABLE documents ADD KEY idx_documents_department_id (department_id), ADD CONSTRAINT fk_documents_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
