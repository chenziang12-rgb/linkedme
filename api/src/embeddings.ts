import OpenAI from 'openai';
import { logger } from './logger.js';
import type { ParsedKnowledgeData } from './knowledge/types.js';
import type { AggregatedKnowledgeBase } from './knowledge/aggregator.js';

const openai = new OpenAI();
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

/**
 * Serialize a parsed knowledge source to a flat text string suitable for embedding.
 */
export function parsedDataToText(data: ParsedKnowledgeData, sourceType?: string): string {
  const parts: string[] = [];
  if (sourceType) parts.push(`Source: ${sourceType}`);
  if (data.name) parts.push(`Name: ${data.name}`);
  if (data.summary) parts.push(`Summary: ${data.summary}`);
  if (data.about) parts.push(`About: ${data.about}`);
  const skills = [...(data.skills || []), ...(data.technical_skills || []), ...(data.soft_skills || [])];
  if (skills.length) parts.push(`Skills: ${[...new Set(skills)].join(', ')}`);
  if (data.experience?.length) {
    parts.push('Experience:\n' + data.experience.map((e) =>
      `- ${e.job_title} at ${e.company}${e.duration ? ` (${e.duration})` : ''}: ${e.description || ''}`
    ).join('\n'));
  }
  if (data.education?.length) {
    parts.push('Education:\n' + data.education.map((e) =>
      `- ${e.degree} in ${e.field_of_study} at ${e.institution}`
    ).join('\n'));
  }
  if (data.projects?.length) {
    parts.push('Projects:\n' + data.projects.map((p) =>
      `- ${p.name}: ${p.description}${p.technologies?.length ? ` [${p.technologies.join(', ')}]` : ''}`
    ).join('\n'));
  }
  if (data.certifications?.length) {
    parts.push('Certifications: ' + data.certifications.map((c) => c.name).join(', '));
  }
  return parts.join('\n');
}

/**
 * Serialize an aggregated knowledge base to a flat text string suitable for embedding.
 */
export function knowledgeBaseToText(kb: AggregatedKnowledgeBase): string {
  const parts: string[] = [];
  if (kb.name) parts.push(`Name: ${kb.name}`);
  if (kb.summary) parts.push(`Summary: ${kb.summary}`);
  if (kb.about) parts.push(`About: ${kb.about}`);
  const skills = [...(kb.skills || []), ...(kb.technical_skills || []), ...(kb.soft_skills || [])];
  if (skills.length) parts.push(`Skills: ${[...new Set(skills)].join(', ')}`);
  if (kb.experience?.length) {
    parts.push('Experience:\n' + kb.experience.map((e) =>
      `- ${e.job_title} at ${e.company}${e.duration ? ` (${e.duration})` : ''}: ${e.description || ''}`
    ).join('\n'));
  }
  if (kb.education?.length) {
    parts.push('Education:\n' + kb.education.map((e) =>
      `- ${e.degree} in ${e.field_of_study} at ${e.institution}`
    ).join('\n'));
  }
  if (kb.projects?.length) {
    parts.push('Projects:\n' + kb.projects.map((p) =>
      `- ${p.name}: ${p.description}${p.technologies?.length ? ` [${p.technologies.join(', ')}]` : ''}`
    ).join('\n'));
  }
  if (kb.certifications?.length) {
    parts.push('Certifications: ' + kb.certifications.map((c) => c.name).join(', '));
  }
  if (kb.interests?.length) parts.push(`Interests: ${kb.interests.join(', ')}`);
  return parts.join('\n');
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 8000));
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    const sorted = response.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
    logger.debug(`Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}`);
  }
  return results;
}
