import { logger } from '../logger.js';
import { generateEmbeddingsBatch, cosineSimilarity } from '../embeddings.js';

export interface ExternalJob {
  c: string; // company
  t: string; // title
  u: string; // url
  m: string; // location
  d: string; // date
  g: string[]; // tags (genres/categories)
}

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  date: string;
  tags: string[];
  industry?: string;
  embedding?: number[];
}

const JOBS_API_URL = 'https://eaziym.github.io/sg-jobs/data/jobs.min.json';
let cachedJobs: NormalizedJob[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let embeddingsReady = false;

async function embedJobsInBackground(jobs: NormalizedJob[]): Promise<void> {
  try {
    logger.info(`Generating RAG embeddings for ${jobs.length} jobs`);
    const texts = jobs.map((j) => `${j.title} ${j.company} ${j.tags.join(' ')}`);
    const embeddings = await generateEmbeddingsBatch(texts);
    jobs.forEach((job, i) => { job.embedding = embeddings[i]; });
    embeddingsReady = true;
    logger.info('Job embeddings ready — semantic search active');
  } catch (err) {
    logger.error({ err }, 'Failed to generate job embeddings, falling back to keyword search');
  }
}

export function areJobEmbeddingsReady(): boolean {
  return embeddingsReady;
}

/**
 * Fetch jobs from external API with caching
 */
export async function fetchExternalJobs(): Promise<NormalizedJob[]> {
  const now = Date.now();
  
  // Return cached jobs if still valid
  if (cachedJobs && (now - cacheTimestamp) < CACHE_TTL) {
    logger.debug(`Returning ${cachedJobs.length} cached jobs`);
    return cachedJobs;
  }

  try {
    logger.info('Fetching jobs from external API');
    const response = await fetch(JOBS_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.statusText}`);
    }
    
    const jobs: ExternalJob[] = await response.json();
    
    // Normalize the job data
    cachedJobs = jobs.map((job, index) => {
      // Generate stable ID based on company, date, and index
      // Use a simple slug format without encoding to avoid URL issues
      const companySlug = job.c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const id = `ext-${companySlug}-${job.d}-${index}`;
      
      // Enhance tags based on job title
      const enhancedTags = [...(job.g || [])];
      const titleLower = job.t.toLowerCase();
      
      // Add Technology/Tech-related tags based on title keywords
      if (titleLower.includes('software') || 
          titleLower.includes('developer') || 
          titleLower.includes('engineer') ||
          titleLower.includes('programmer') ||
          titleLower.includes('tech') ||
          titleLower.includes('data') ||
          titleLower.includes('analyst') ||
          titleLower.includes('devops') ||
          titleLower.includes('cloud') ||
          titleLower.includes('frontend') ||
          titleLower.includes('backend') ||
          titleLower.includes('fullstack') ||
          titleLower.includes('full stack') ||
          titleLower.includes('ai') ||
          titleLower.includes('ml') ||
          titleLower.includes('machine learning') ||
          titleLower.includes('product manager') ||
          titleLower.includes('scrum') ||
          titleLower.includes('agile')) {
        if (!enhancedTags.some(tag => tag.toLowerCase() === 'technology')) {
          enhancedTags.push('Technology');
        }
        if (!enhancedTags.some(tag => tag.toLowerCase() === 'tech')) {
          enhancedTags.push('Tech');
        }
      }
      
      // Add AI/ML tag
      if (titleLower.includes('ai') || 
          titleLower.includes('ml') || 
          titleLower.includes('machine learning') ||
          titleLower.includes('artificial intelligence') ||
          titleLower.includes('deep learning') ||
          titleLower.includes('neural network') ||
          titleLower.includes('computer vision') ||
          titleLower.includes('nlp') ||
          titleLower.includes('natural language')) {
        if (!enhancedTags.some(tag => tag.toLowerCase() === 'ai/ml')) {
          enhancedTags.push('AI/ML');
        }
      }
      
      // Add Data Analytics tag
      if (titleLower.includes('data') || 
          titleLower.includes('analyst') ||
          titleLower.includes('analytics') ||
          titleLower.includes('business intelligence') ||
          titleLower.includes('bi ') ||
          titleLower.includes('dashboard') ||
          titleLower.includes('visualization') ||
          titleLower.includes('tableau') ||
          titleLower.includes('power bi')) {
        if (!enhancedTags.some(tag => tag.toLowerCase() === 'data analytics')) {
          enhancedTags.push('Data Analytics');
        }
      }
      
      // Add Marketing tag if title contains marketing-related keywords
      if (titleLower.includes('marketing') || 
          titleLower.includes('brand') || 
          titleLower.includes('content') ||
          titleLower.includes('digital marketing') ||
          titleLower.includes('growth') ||
          titleLower.includes('seo') ||
          titleLower.includes('sem')) {
        if (!enhancedTags.includes('Marketing')) {
          enhancedTags.push('Marketing');
        }
      }
      
      // Add Finance tag
      if (titleLower.includes('finance') || 
          titleLower.includes('accounting') ||
          titleLower.includes('audit') ||
          titleLower.includes('financial') ||
          titleLower.includes('investment') ||
          titleLower.includes('banking')) {
        if (!enhancedTags.includes('Finance')) {
          enhancedTags.push('Finance');
        }
      }
      
      // Add "Others" tag if no specific category tags exist
      const hasSpecificTag = enhancedTags.some(tag => 
        !['remote', 'hybrid', 'full-time', 'part-time', 'contract', 'internship'].includes(tag.toLowerCase())
      );
      if (!hasSpecificTag) {
        enhancedTags.push('Others');
      }
      
      return {
        id,
        title: job.t,
        company: job.c,
        location: job.m,
        url: job.u,
        date: job.d,
        tags: enhancedTags,
        industry: inferIndustry(enhancedTags)
      };
    });
    
    cacheTimestamp = now;
    embeddingsReady = false;
    logger.info(`Fetched and cached ${cachedJobs.length} jobs from external API`);

    // Generate embeddings in background so first response isn't delayed
    void embedJobsInBackground(cachedJobs);

    return cachedJobs;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch external jobs');
    
    // Return stale cache if available, otherwise empty array
    if (cachedJobs) {
      logger.warn('Returning stale cached jobs due to fetch error');
      return cachedJobs;
    }
    
    return [];
  }
}

/**
 * Infer industry from job tags
 */
function inferIndustry(tags: string[]): string | undefined {
  const industryMap: Record<string, string> = {
    'Technology': 'Technology',
    'Finance': 'Finance',
    'Healthcare': 'Healthcare',
    'Consulting': 'Consulting',
    'Manufacturing': 'Manufacturing',
    'Logistics': 'Logistics',
    'Energy': 'Energy'
  };
  
  for (const tag of tags) {
    const industry = industryMap[tag];
    if (industry) return industry;
  }
  
  // Default to Technology if no industry found
  return 'Technology';
}

/**
 * Filter jobs based on criteria.
 * When searchEmbedding is provided (and jobs have embeddings), uses semantic
 * cosine-similarity ranking instead of substring matching.
 */
export function filterJobs(
  jobs: NormalizedJob[],
  filters: {
    search?: string;
    searchEmbedding?: number[];
    location?: string;
    industry?: string;
    tags?: string;
    company?: string;
    limit?: number;
  }
): NormalizedJob[] {
  let filtered = [...jobs];

  // Search filter — semantic when embeddings are ready, keyword fallback otherwise
  if (filters.search) {
    if (filters.searchEmbedding && filtered.some((j) => j.embedding)) {
      filtered = filtered
        .map((j) => ({ j, score: j.embedding ? cosineSimilarity(filters.searchEmbedding!, j.embedding) : 0 }))
        .filter(({ score }) => score > 0.25)
        .sort((a, b) => b.score - a.score)
        .map(({ j }) => j);
    } else {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.company.toLowerCase().includes(term) ||
          job.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }
  }

  // Location filter
  if (filters.location) {
    const locationLower = filters.location.toLowerCase();
    filtered = filtered.filter(job =>
      job.location.toLowerCase().includes(locationLower)
    );
  }

  // Industry filter
  if (filters.industry) {
    const industryLower = filters.industry.toLowerCase();
    filtered = filtered.filter(job =>
      job.industry === industryLower ||
      job.tags.some(tag => tag.toLowerCase() === industryLower)
    );
  }

  // Tags filter (supports multiple comma-separated tags)
  if (filters.tags) {
    const selectedTags = filters.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    if (selectedTags.length > 0) {
      filtered = filtered.filter(job =>
        selectedTags.some(selectedTag =>
          job.tags.some(tag => tag.toLowerCase() === selectedTag)
        )
      );
    }
  }

  // Company filter (supports multiple comma-separated companies)
  if (filters.company) {
    const selectedCompanies = filters.company.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
    if (selectedCompanies.length > 0) {
      filtered = filtered.filter(job =>
        selectedCompanies.some(selectedCompany =>
          job.company.toLowerCase() === selectedCompany
        )
      );
    }
  }

  // Limit results
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearJobsCache(): void {
  cachedJobs = null;
  cacheTimestamp = 0;
  logger.info('Jobs cache cleared');
}
