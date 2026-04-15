// Generated Materials API Routes
// Handles resume and cover letter generation for specific jobs

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { supabaseAdmin } from '../supabase.js';
import { aggregateKnowledgeBase, type AggregatedKnowledgeBase } from '../knowledge/aggregator.js';
import { generateEmbedding } from '../embeddings.js';
import { generateResume, type JobInfo } from '../ai/resume_generator.js';
import { generateCoverLetter } from '../ai/cover_letter_generator.js';
import { fetchExternalJobs } from '../jobs/external.js';
import { fetchJobDescription } from '../jobs/jdFetcher.js';

const router = express.Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const generateResumeSchema = z.object({
  tone: z.enum(['formal', 'professional', 'enthusiastic']).optional(),
});

const generateCoverLetterSchema = z.object({
  tone: z.enum(['formal', 'professional', 'enthusiastic']).optional(),
});

// ============================================================================
// Helper: Get user knowledge base efficiently
// Uses unified profile view that combines profiles + knowledge_sources
// ============================================================================

async function getUserKnowledgeBase(userId: string): Promise<AggregatedKnowledgeBase> {
  logger.info(`Fetching knowledge base for user ${userId}`);
  
  // Get the unified, LLM-aggregated profile from profiles.knowledge_base_summary
  // This is the single source of truth that combines all knowledge sources
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('knowledge_base_summary, knowledge_base_updated_at')
    .eq('id', userId)
    .single();
  
  if (profileError || !profileData) {
    logger.error('Failed to fetch user profile:', profileError);
    throw new Error('No profile found. Please add a resume or LinkedIn profile first.');
  }
  
  const knowledgeBase = profileData.knowledge_base_summary as AggregatedKnowledgeBase | null;
  
  if (!knowledgeBase) {
    throw new Error('No aggregated knowledge base found. Please add a resume or LinkedIn profile first.');
  }
  
  logger.info(`Using unified profile for user ${userId}, last updated: ${profileData.knowledge_base_updated_at}`);
  
  // Comprehensive logging of knowledge base structure
  logger.info('=== KNOWLEDGE BASE DATA FROM DB ===');
  logger.info({ name: knowledgeBase.name });
  logger.info({ email: knowledgeBase.email });
  logger.info({ phone: knowledgeBase.phone });
  logger.info({ linkedin_profile_url: knowledgeBase.linkedin_profile_url });
  logger.info({ github_username: knowledgeBase.github_username });
  logger.info({ location: knowledgeBase.location });
  logger.info({ summary_length: knowledgeBase.summary?.length || 0 });
  logger.info({ skills_count: knowledgeBase.skills?.length || 0 });
  logger.info({ technical_skills_count: knowledgeBase.technical_skills?.length || 0 });
  logger.info({ soft_skills_count: knowledgeBase.soft_skills?.length || 0 });
  logger.info({ experience_count: knowledgeBase.experience?.length || 0 });
  logger.info({ education_count: knowledgeBase.education?.length || 0 });
  logger.info({ projects_count: knowledgeBase.projects?.length || 0 });
  logger.info({ certifications_count: knowledgeBase.certifications?.length || 0 });
  logger.info({ languages_count: knowledgeBase.languages?.length || 0 });
  logger.info({ sources_count: knowledgeBase.sources?.length || 0 });
  logger.info('===================================');
  
  return knowledgeBase;
}

// ============================================================================
// Helper: Fetch job details from database or external API
// ============================================================================

async function embedMaterial(id: string, content: string): Promise<void> {
  const embedding = await generateEmbedding(content);
  await supabaseAdmin.from('generated_materials').update({ embedding }).eq('id', id);
  logger.info({ materialId: id }, 'Generated material embedding stored');
}

async function getJobDetails(jobId: string): Promise<JobInfo | null> {
  logger.info(`Fetching job details for job ${jobId}`);
  
  // First try to find in local database
  const { data: localJob, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  
  if (localJob && !error) {
    logger.info('Job found in local database');
    logger.info('=== JOB DETAILS (LOCAL DB) ===');
    logger.info({ title: localJob.title });
    logger.info({ company: localJob.company });
    logger.info({ location: localJob.location });
    logger.info({ description_length: localJob.description?.length || 0 });
    logger.info({ requirements_count: localJob.requirements?.length || 0 });
    logger.info('==============================');
    
    return {
      title: localJob.title,
      company: localJob.company,
      location: localJob.location,
      description: localJob.description,
      requirements: localJob.requirements,
      preferred_qualifications: localJob.preferred_qualifications,
    };
  }
  
  // If not found locally, check external jobs
  logger.info('Job not found in local DB, checking external jobs');
  const externalJobs = await fetchExternalJobs();
  const externalJob = externalJobs.find(j => j.id === jobId);
  
  if (!externalJob) {
    logger.warn(`Job ${jobId} not found in external jobs either`);
    return null;
  }
  
  logger.info('Job found in external jobs, fetching full JD via webhook');
  
  // Fetch full job description
  const jdData = await fetchJobDescription(externalJob.url, externalJob.company);
  
  const jobDetails = {
    title: jdData?.title || externalJob.title,
    company: externalJob.company,
    location: jdData?.location || externalJob.location,
    description: jdData?.jdText || `Join ${externalJob.company} as a ${externalJob.title}.`,
    requirements: externalJob.tags || [],
    preferred_qualifications: [],
  };
  
  logger.info('=== JOB DETAILS (EXTERNAL + WEBHOOK) ===');
  logger.info({ title: jobDetails.title });
  logger.info({ company: jobDetails.company });
  logger.info({ location: jobDetails.location });
  logger.info({ description_length: jobDetails.description.length });
  logger.info({ description_preview: jobDetails.description.slice(0, 200) + '...' });
  logger.info({ requirements_count: jobDetails.requirements?.length || 0 });
  logger.info({ webhook_returned_jd: !!jdData?.jdText });
  logger.info('========================================');
  
  return jobDetails;
}

// ============================================================================
// POST /api/generate/resume/:jobId
// Generate a tailored resume for a specific job
// ============================================================================

router.post('/resume/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;
    
    logger.info(`Generating resume for user ${userId}, job ${jobId}`);
    
    // Validate request body
    const body = generateResumeSchema.parse(req.body);
    
    // Get job details
    const job = await getJobDetails(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get user's knowledge base efficiently (using latest source, no LLM aggregation)
    const knowledgeBase = await getUserKnowledgeBase(userId);
    
    // Generate resume
    const generatedResume = await generateResume(knowledgeBase, job);
    
    // Delete any existing resume for this job first to avoid duplicates
    const { data: deletedResumes, error: deleteError } = await supabaseAdmin
      .from('generated_materials')
      .delete()
      .eq('user_id', userId)
      .eq('job_external_id', jobId)
      .eq('material_type', 'resume')
      .select();
    
    if (deletedResumes && deletedResumes.length > 0) {
      logger.info('Deleted existing resumes before generating new one', { 
        count: deletedResumes.length,
        userId,
        jobId 
      });
    }
    
    // Save to database
    const { data: material, error } = await supabaseAdmin
      .from('generated_materials')
      .insert({
        user_id: userId,
        job_external_id: jobId, // Using job_external_id for external jobs
        material_type: 'resume',
        content: generatedResume.content,
        generation_metadata: { // Fixed: using generation_metadata
          word_count: generatedResume.word_count,
          sections: generatedResume.sections,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();
    
    if (error) throw error;

    // Fire-and-forget: embed the generated resume for future similarity lookups
    if (material) {
      embedMaterial(material.id, generatedResume.content).catch((err) =>
        logger.warn({ err, materialId: material.id }, 'Failed to embed resume')
      );
    }

    res.json({
      material,
      message: 'Resume generated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    
    logger.error('Failed to generate resume:', error);
    
    // Handle different error types
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    res.status(500).json({
      error: 'Failed to generate resume',
      message: errorMessage,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
      }),
    });
  }
});

// ============================================================================
// POST /api/generate/cover-letter/:jobId
// Generate a personalized cover letter for a specific job
// ============================================================================

router.post('/cover-letter/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;
    
    logger.info(`Generating cover letter for user ${userId}, job ${jobId}`);
    
    // Validate request body
    const body = generateCoverLetterSchema.parse(req.body);
    const tone = body.tone || 'professional';
    
    // Get job details
    const job = await getJobDetails(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get user's knowledge base efficiently (using latest source, no LLM aggregation)
    const knowledgeBase = await getUserKnowledgeBase(userId);
    
    // Generate cover letter
    const generatedCoverLetter = await generateCoverLetter(knowledgeBase, job, tone);
    
    // Delete any existing cover letter for this job first to avoid duplicates
    const { data: deletedCoverLetters, error: deleteError } = await supabaseAdmin
      .from('generated_materials')
      .delete()
      .eq('user_id', userId)
      .eq('job_external_id', jobId)
      .eq('material_type', 'cover_letter')
      .select();
    
    if (deletedCoverLetters && deletedCoverLetters.length > 0) {
      logger.info('Deleted existing cover letters before generating new one', { 
        count: deletedCoverLetters.length,
        userId,
        jobId 
      });
    }
    
    // Save to database
    const { data: material, error } = await supabaseAdmin
      .from('generated_materials')
      .insert({
        user_id: userId,
        job_external_id: jobId, // Using job_external_id for external jobs
        material_type: 'cover_letter',
        content: generatedCoverLetter.content,
        generation_metadata: { // Fixed: using generation_metadata
          word_count: generatedCoverLetter.word_count,
          tone: generatedCoverLetter.tone,
          key_points: generatedCoverLetter.key_points,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();
    
    if (error) throw error;

    // Fire-and-forget: embed the generated cover letter for future similarity lookups
    if (material) {
      embedMaterial(material.id, generatedCoverLetter.content).catch((err) =>
        logger.warn({ err, materialId: material.id }, 'Failed to embed cover letter')
      );
    }

    res.json({
      material,
      message: 'Cover letter generated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    
    logger.error('Failed to generate cover letter:', error);
    
    // Handle different error types
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    res.status(500).json({
      error: 'Failed to generate cover letter',
      message: errorMessage,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
      }),
    });
  }
});

// ============================================================================
// GET /api/generate/:jobId/materials
// Get all generated materials for a specific job
// ============================================================================

router.get('/:jobId/materials', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;
    
    const { data: materials, error } = await supabaseAdmin
      .from('generated_materials')
      .select('*')
      .eq('user_id', userId)
      .eq('job_external_id', jobId) // Fixed: using job_external_id
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ materials });
  } catch (error) {
    logger.error('Failed to fetch generated materials:', error);
    res.status(500).json({
      error: 'Failed to fetch materials',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// GET /api/generate/:id
// Get a specific generated material by ID
// ============================================================================

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const { data: material, error } = await supabaseAdmin
      .from('generated_materials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ material });
  } catch (error) {
    logger.error('Failed to fetch generated material:', error);
    res.status(500).json({
      error: 'Failed to fetch material',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// PATCH /api/generate/:id
// Update a generated material's content
// ============================================================================

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }
    
    // First verify the material belongs to the user
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('generated_materials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    // Update the content
    const { data: material, error } = await supabaseAdmin
      .from('generated_materials')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      material,
      message: 'Material updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update generated material:', error);
    res.status(500).json({
      error: 'Failed to update material',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// DELETE /api/generate/:id
// Delete a generated material
// ============================================================================

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('generated_materials')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete generated material:', error);
    res.status(500).json({
      error: 'Failed to delete material',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
