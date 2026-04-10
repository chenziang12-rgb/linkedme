export type EducationLevel = 'Diploma' | 'Bachelors' | 'Masters' | 'PhD';

export type PlanTier = 'freemium' | 'standard' | 'pro' | 'ultimate';

export interface User {
  id: string;
  name: string;
  gender?: string;
  nationality?: string;
  educationLevel: EducationLevel;
  educationInstitution?: string;
  certifications?: string[];
  yearsExperience?: number;
  skills: string[];
  expectedSalarySGD?: number;
  plan: PlanTier;
  latestCompassScore?: {
    total: number;
    totalRaw: number;
    verdict: CompassVerdict;
    breakdown: CompassBreakdown;
    notes: string[];
    calculatedAt?: string;
  } | null;
}

export interface EmployerMeta {
  size: 'SME' | 'MNC' | 'Gov' | 'Startup';
  localHQ?: boolean;
  diversityScore?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  salaryMinSGD?: number;
  salaryMaxSGD?: number;
  description: string;
  requirements: string[];
  employer: EmployerMeta;
  createdAt: string;
  score?: number;
  epIndicator?: CompassVerdict;
  url?: string;
  applyUrl?: string;
  isInternSG?: boolean;
  hrName?: string;
  source?: string;
  semanticScore?: number; // RAG cosine similarity to user profile (0–1)
}

export type CompassVerdict = 'Likely' | 'Borderline' | 'Unlikely';

export interface CompassBreakdown {
  salary: number;
  qualifications: number;
  diversity: number;
  support: number;
  skills: number;
  strategic: number;
}

export interface CompassScore {
  total: number; // percentage (0-100)
  totalRaw: number; // raw points (0-110)
  breakdown: CompassBreakdown;
  verdict: CompassVerdict;
  notes: string[];
}

export interface ParsedProfile {
  name?: string;
  email?: string;
  skills: string[];
  educationLevel?: EducationLevel;
  educationInstitution?: string;
  yearsExperience?: number;
  lastTitle?: string;
  expectedSalarySGD?: number;
  nationality?: string;
  gender?: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  currentlyStudying?: boolean;
  description?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  employmentType?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
}

export type ApplicationStatus = 'draft' | 'sent' | 'responded' | 'rejected' | 'interview' | 'offer';

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobUrl?: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}
