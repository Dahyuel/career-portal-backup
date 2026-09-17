// Employer onboarding: accounts are created by admins, then the employer fills in
// their profile and picks one of their events (see v2_09).
import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface EmployerEvent {
  event_id: string;
  event_name: string;
  event_type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  is_ended: boolean;
  is_current: boolean;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  job_title: string | null;
}

export interface EmployerStatus {
  is_employer: boolean;
  profile_complete: boolean;
  profile: {
    full_name: string | null;
    phone: string | null;
    personal_id: string | null;
    nationality: string | null;
    gender: string | null;
  } | null;
  events: EmployerEvent[];
}

export const getEmployerStatus = async (): Promise<EmployerStatus | null> => {
  const { data, error } = await supabase.rpc('employer_get_my_events');
  if (error) {
    logger.error('[EMPLOYER] could not load status', error);
    return null;
  }
  return data as EmployerStatus;
};

export interface EmployerProfileInput {
  fullName: string;
  phone: string;
  personalId: string;
  nationality: string;
  gender: string;
  jobTitle: string;
}

export const completeEmployerProfile = async (
  input: EmployerProfileInput
): Promise<{ success: boolean; error?: string; field?: string }> => {
  const { data, error } = await supabase.rpc('employer_complete_profile', {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_personal_id: input.personalId,
    p_nationality: input.nationality,
    p_gender: input.gender,
    p_job_title: input.jobTitle
  });
  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || 'Could not save your details', field: data?.field };
  return { success: true };
};

/** Joins the event if the employer's company takes part but they aren't in it yet. */
export const openEmployerEvent = async (eventId: string): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.rpc('employer_open_event', { p_event_id: eventId });
  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || 'Could not open this event' };
  return { success: true };
};
