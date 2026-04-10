import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import JobCard from '../components/JobCard';
import EmptyState from '../components/EmptyState';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { useJobs } from '../hooks/useJobs';
import { fetchJobFilters } from '../api/client';
import { Sparkles } from 'lucide-react';

interface Filters {
  search: string;
  tags: string[];
  company: string[];
}

const defaultFilters: Filters = {
  search: '',
  tags: [],
  company: []
};

const PAGE_SIZE = 50;

const SEMANTIC_MATCH_THRESHOLD = 0.62;

export default function JobsListPage(): JSX.Element {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['job-filters'],
    queryFn: fetchJobFilters
  });
  
  const { data, isLoading } = useJobs({
    search: appliedFilters.search,
    tags: appliedFilters.tags.join(','),
    company: appliedFilters.company.join(','),
    page: currentPage,
    pageSize: PAGE_SIZE
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  // Jobs are already sorted and scored by the backend (RAG semantic ranking)
  const jobs = data?.items || [];

  const totalPages = data?.totalPages || 0;
  const showingStart = jobs.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingEnd = jobs.length ? showingStart + jobs.length - 1 : 0;

  return (
    <div className="flex flex-col bg-slate-50" style={{height: 'calc(100vh - 120px)'}}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Filter Form */}
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:grid-cols-3 mb-6"
          >
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="e.g. data, product, fintech"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            
            <MultiSelectDropdown
              label="Company"
              options={filterMetadata?.companies || []}
              selected={filters.company}
              onChange={(selected) => setFilters((prev) => ({ ...prev, company: selected }))}
              placeholder="All companies"
            />
            
            <MultiSelectDropdown
              label="Tags"
              options={filterMetadata?.tags || []}
              selected={filters.tags}
              onChange={(selected) => setFilters((prev) => ({ ...prev, tags: selected }))}
              placeholder="All tags"
            />
            
            <div className="flex items-end gap-3 md:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Job Listings */}
          <div className="grid gap-6">
            {isLoading && <p className="text-sm text-slate-500">Loading results...</p>}
            {data && data.items.length === 0 && (
              <EmptyState
                title="No jobs matched your filters"
                description="Try widening your filters or updating your preferences."
              />
            )}
            {jobs.map((job) => (
              <div key={job.id} className="relative overflow-hidden">
                {job.semanticScore !== undefined && job.semanticScore >= SEMANTIC_MATCH_THRESHOLD && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-2.5">
                    <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-blue-900">
                      {Math.round(job.semanticScore * 100)}% profile match
                    </span>
                  </div>
                )}
                <JobCard job={job} />
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {data && data.items.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <div className="text-sm text-slate-600">
                Showing {showingStart}-{showingEnd} of {data.total} results
              </div>
              <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg className="h-4 w-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition min-w-[40px] flex-shrink-0 ${
                          currentPage === pageNum
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="h-4 w-4 sm:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
