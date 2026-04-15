-- RAG Embedding Columns Migration
-- Adds float8[] embedding vectors to knowledge_sources, profiles, and generated_materials
-- for semantic retrieval, richer job ranking, and material deduplication.

ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS embedding float8[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_embedding float8[];
ALTER TABLE generated_materials ADD COLUMN IF NOT EXISTS embedding float8[];

-- Index comments for documentation
COMMENT ON COLUMN knowledge_sources.embedding IS '1536-dim text-embedding-3-small vector of parsed source content. Generated after processing completes.';
COMMENT ON COLUMN profiles.profile_embedding IS '1536-dim text-embedding-3-small vector of the full aggregated knowledge_base_summary. Generated after each aggregation.';
COMMENT ON COLUMN generated_materials.embedding IS '1536-dim text-embedding-3-small vector of generated resume/cover letter content.';
