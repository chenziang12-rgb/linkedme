// Knowledge Base Aggregator
// Combines all knowledge sources into a unified knowledge base using LLM

import { supabaseAdmin } from '../supabase.js';
import { logger } from '../logger.js';
import type { ParsedKnowledgeData } from './types.js';
import { getKnowledgeSources } from './sources.js';
import { generateEmbedding, knowledgeBaseToText } from '../embeddings.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AggregatedKnowledgeBase {
  // Aggregated fields
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Combined arrays (deduplicated)
  skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  languages: Array<{ language: string; proficiency: string }>;
  
  // All experiences from all sources
  experience: Array<{
    job_title: string;
    company: string;
    location?: string;
    duration: string;
    description: string;
    start_date?: { year: number; month?: string };
    end_date?: { year: number; month?: string };
    is_current?: boolean;
    skills?: string[];
    source?: string; // Which source this came from
  }>;
  
  // All education from all sources
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    duration: string;
    start_date?: { year: number };
    end_date?: { year: number };
    gpa?: string;
    source?: string;
  }>;
  
  // All certifications
  certifications: Array<{
    name: string;
    issuer: string;
    issued_date?: string;
    expiry_date?: string;
    source?: string;
  }>;
  
  // All projects
  projects: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    start_date?: string;
    end_date?: string;
    source?: string;
  }>;
  
  // Combined context
  summary?: string;
  about?: string;
  interests: string[];
  publications: string[];
  awards: string[];
  
  // Links
  linkedin_profile_url?: string;
  github_username?: string;
  personal_website_urls: string[];
  
  // Source metadata
  sources: Array<{
    type: string;
    identifier?: string;
    created_at: string;
  }>;
}

export async function aggregateKnowledgeBase(userId: string): Promise<AggregatedKnowledgeBase> {
  logger.info(`Aggregating knowledge base for user ${userId}`);
  
  const sources = await getKnowledgeSources(userId);
  const completedSources = sources.filter((s) => s.processing_status === 'completed');
  
  if (completedSources.length === 0) {
    logger.warn(`No completed knowledge sources for user ${userId}`);
    return createEmptyKnowledgeBase();
  }
  
  // If only one source, no need for LLM aggregation
  if (completedSources.length === 1) {
    logger.info('Only one source, using it directly');
    return convertSingleSourceToKnowledgeBase(completedSources[0]);
  }
  
  // Use LLM to intelligently merge multiple sources
  try {
    const aggregated = await aggregateWithLLM(completedSources);
    logger.info(`LLM aggregated knowledge base: ${aggregated.skills.length} skills, ${aggregated.experience.length} experiences`);
    return aggregated;
  } catch (error) {
    logger.error('LLM aggregation failed, falling back to simple merge:', error);
    return fallbackAggregation(completedSources);
  }
}

function createEmptyKnowledgeBase(): AggregatedKnowledgeBase {
  return {
    skills: [],
    technical_skills: [],
    soft_skills: [],
    languages: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    interests: [],
    publications: [],
    awards: [],
    personal_website_urls: [],
    sources: [],
  };
}

// Convert a single source to knowledge base format
function convertSingleSourceToKnowledgeBase(source: any): AggregatedKnowledgeBase {
  const data = source.parsed_data as ParsedKnowledgeData;
  
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    location: data.location,
    summary: data.summary || data.about,
    about: data.about,
    linkedin_profile_url: data.linkedin_profile_url,
    github_username: data.github_username,
    skills: data.skills || [],
    technical_skills: data.technical_skills || [],
    soft_skills: data.soft_skills || [],
    languages: data.languages || [],
    experience: (data.experience || []).map(exp => ({ ...exp, source: source.source_type })),
    education: (data.education || []).map(edu => ({ ...edu, source: source.source_type })),
    certifications: (data.certifications || []).map(cert => ({ ...cert, source: source.source_type })),
    projects: (data.projects || []).map(proj => ({ ...proj, source: source.source_type })),
    interests: data.interests || [],
    publications: data.publications || [],
    awards: data.awards || [],
    personal_website_urls: data.personal_website_url ? [data.personal_website_url] : [],
    sources: [{
      type: source.source_type,
      identifier: source.source_identifier,
      created_at: source.created_at,
    }],
  };
}

// LLM-based intelligent aggregation
async function aggregateWithLLM(sources: any[]): Promise<AggregatedKnowledgeBase> {
  logger.info(`Using LLM to aggregate ${sources.length} sources`);
  
  // Load system prompt
  const promptPath = path.join(__dirname, '../../resources/llm_prompts/aggregate_profile.txt');
  const systemPrompt = fs.readFileSync(promptPath, 'utf-8');
  
  // Prepare sources data for LLM
  const sourcesData = sources.map(source => ({
    source_type: source.source_type,
    source_identifier: source.source_identifier,
    parsed_data: source.parsed_data,
  }));
  
  const userPrompt = `Here are ${sources.length} profile sources to merge:\n\n${JSON.stringify(sourcesData, null, 2)}\n\nMerge these intelligently into a single unified profile.`;
  
  logger.info('Calling OpenAI for profile aggregation...');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // Low temperature for consistent, accurate merging
    response_format: { type: 'json_object' },
  });
  
  const result = completion.choices[0].message.content;
  if (!result) {
    throw new Error('No response from OpenAI');
  }
  
  const mergedProfile = JSON.parse(result);
  
  // Add source tracking
  const sourcesMetadata = sources.map(s => ({
    type: s.source_type,
    identifier: s.source_identifier,
    created_at: s.created_at,
  }));
  
  return {
    ...mergedProfile,
    sources: sourcesMetadata,
  };
}

// Fallback aggregation (simple merge) if LLM fails
function fallbackAggregation(sources: any[]): AggregatedKnowledgeBase {
  logger.warn('Using fallback aggregation (simple merge)');
  
  const aggregated: AggregatedKnowledgeBase = {
    skills: [],
    technical_skills: [],
    soft_skills: [],
    languages: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    interests: [],
    publications: [],
    awards: [],
    personal_website_urls: [],
    sources: [],
  };
  
  for (const source of sources) {
    const data = source.parsed_data as ParsedKnowledgeData;
    
    aggregated.name = aggregated.name || data.name;
    aggregated.email = aggregated.email || data.email;
    aggregated.phone = aggregated.phone || data.phone;
    aggregated.location = aggregated.location || data.location;
    aggregated.summary = aggregated.summary || data.summary;
    aggregated.about = aggregated.about || data.about;
    aggregated.linkedin_profile_url = aggregated.linkedin_profile_url || data.linkedin_profile_url;
    aggregated.github_username = aggregated.github_username || data.github_username;
    
    if (data.skills) aggregated.skills.push(...data.skills);
    if (data.technical_skills) aggregated.technical_skills.push(...data.technical_skills);
    if (data.soft_skills) aggregated.soft_skills.push(...data.soft_skills);
    if (data.interests) aggregated.interests.push(...data.interests);
    if (data.publications) aggregated.publications.push(...data.publications);
    if (data.awards) aggregated.awards.push(...data.awards);
    if (data.personal_website_url) aggregated.personal_website_urls.push(data.personal_website_url);
    
    if (data.experience) {
      aggregated.experience.push(...data.experience.map(exp => ({ ...exp, source: source.source_type })));
    }
    if (data.education) {
      aggregated.education.push(...data.education.map(edu => ({ ...edu, source: source.source_type })));
    }
    if (data.certifications) {
      aggregated.certifications.push(...data.certifications.map(cert => ({ ...cert, source: source.source_type })));
    }
    if (data.projects) {
      aggregated.projects.push(...data.projects.map(proj => ({ ...proj, source: source.source_type })));
    }
    if (data.languages) {
      aggregated.languages.push(...data.languages);
    }
    
    aggregated.sources.push({
      type: source.source_type,
      identifier: source.source_identifier,
      created_at: source.created_at,
    });
  }
  
  // Simple deduplication
  aggregated.skills = [...new Set(aggregated.skills)];
  aggregated.technical_skills = [...new Set(aggregated.technical_skills)];
  aggregated.soft_skills = [...new Set(aggregated.soft_skills)];
  aggregated.interests = [...new Set(aggregated.interests)];
  
  return aggregated;
}

// Save aggregated knowledge base to profile
export async function saveAggregatedKnowledgeBase(
  userId: string,
  knowledgeBase: AggregatedKnowledgeBase
): Promise<void> {
  const timestamp = new Date().toISOString();
  logger.info(`[SAVE AGGREGATE] Saving aggregated knowledge base for user ${userId} with ${knowledgeBase.sources?.length || 0} sources, timestamp: ${timestamp}`);
  
  // Combine all skills for the profile.skills field (used for navigation unlock)
  const allSkills = [
    ...(knowledgeBase.skills || []),
    ...(knowledgeBase.technical_skills || []),
    ...(knowledgeBase.soft_skills || []),
  ];
  const uniqueSkills = [...new Set(allSkills)];
  
  logger.info(`[SAVE AGGREGATE] Updating profile with ${uniqueSkills.length} unique skills`);
  
  // Use UPSERT to create profile if it doesn't exist yet (for new users)
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId, // Primary key for upsert
      knowledge_base_summary: knowledgeBase,
      knowledge_base_updated_at: timestamp,
      skills: uniqueSkills, // Update skills to unlock navigation
      name: knowledgeBase.name || 'User', // Update name if available, default to 'User'
      plan: 'freemium', // Default plan for new users
    }, {
      onConflict: 'id', // Upsert based on user ID
    })
    .eq('id', userId);
  
  if (error) {
    logger.error('[SAVE AGGREGATE] Failed to save aggregated knowledge base:', error);
    throw new Error(`Failed to save knowledge base: ${error.message}`);
  }
  
  logger.info(`[SAVE AGGREGATE] ✅ Saved aggregated knowledge base for user ${userId} with ${knowledgeBase.sources?.length || 0} sources and ${uniqueSkills.length} skills at ${timestamp}`);

  // Fire-and-forget: embed the full aggregated profile for richer job ranking
  embedAggregatedProfile(userId, knowledgeBase).catch((err) =>
    logger.warn({ err, userId }, 'Failed to generate profile embedding')
  );
}

async function embedAggregatedProfile(userId: string, kb: AggregatedKnowledgeBase): Promise<void> {
  const text = knowledgeBaseToText(kb);
  if (!text.trim()) return;
  const embedding = await generateEmbedding(text);
  await supabaseAdmin.from('profiles').update({ profile_embedding: embedding }).eq('id', userId);
  logger.info({ userId }, 'Profile embedding stored');
}

// Get aggregated knowledge base from profile
export async function getAggregatedKnowledgeBase(userId: string): Promise<AggregatedKnowledgeBase | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('knowledge_base_summary, knowledge_base_updated_at')
    .eq('id', userId)
    .single();
  
  if (error) {
    logger.error('Failed to get aggregated knowledge base:', {
      error: error.message,
      code: error.code,
      details: error.details,
      userId,
    });
    return null;
  }
  
  if (!data) {
    logger.warn(`No profile found for user ${userId}`);
    return null;
  }
  
  const kb = data?.knowledge_base_summary as AggregatedKnowledgeBase | null;
  
  if (!kb) {
    logger.warn(`User ${userId} has no aggregated knowledge base yet`);
    return null;
  }
  
  logger.info(`Retrieved aggregated knowledge base for user ${userId}: ${kb?.sources?.length || 0} sources, updated at ${data?.knowledge_base_updated_at}`);
  
  return kb;
}
