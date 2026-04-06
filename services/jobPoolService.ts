import { apiRequest } from "./api";

export interface Job {
  _id: string;
  title: string;
  description: string;
  location: string;
  job_date: string;
  start_time: string;
  end_time: string;
  pay_rate: number;
  requirements: string;
  notes: string;
  status: number;
  posted_by: string;
  posted_by_name: string;
  created_date: string;
  modified_date: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface JobPoolResponse {
  success: boolean;
  data: {
    jobs: Job[];
    pagination: Pagination;
  };
}

export async function fetchJobPoolListings(page = 1, limit = 20): Promise<JobPoolResponse> {
  return apiRequest<JobPoolResponse>(`/mobile/pool/jobs?page=${page}&limit=${limit}`);
}

export interface JobDetailResponse {
  success: boolean;
  data: Job;
}

export async function fetchJobDetail(jobId: string): Promise<JobDetailResponse> {
  return apiRequest<JobDetailResponse>(`/mobile/pool/jobs/${jobId}`);
}

export interface AcceptJobResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function acceptJob(jobId: string): Promise<AcceptJobResponse> {
  return apiRequest<AcceptJobResponse>(`/mobile/pool/jobs/${jobId}/accept`, { method: 'POST' });
}

export async function fetchMyJobs(page = 1, limit = 20): Promise<JobPoolResponse> {
  return apiRequest<JobPoolResponse>(`/mobile/pool/my-jobs?page=${page}&limit=${limit}`);
}

export async function fetchMyJobDetail(jobId: string): Promise<JobDetailResponse> {
  return apiRequest<JobDetailResponse>(`/mobile/pool/my-jobs/${jobId}`);
}
