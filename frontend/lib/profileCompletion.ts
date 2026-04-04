export type MissingProfileItem = {
  label: string;
  path: string;
};

export type JobseekerProfileCompletion = {
  percent: number;
  isComplete: boolean;
  missing: MissingProfileItem[];
};

export type RoleProfileCompletion = {
  percent: number;
  isComplete: boolean;
  missing: MissingProfileItem[];
};

const isFilled = (value: any) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
};

export const getJobseekerProfileCompletion = (profile: any): JobseekerProfileCompletion => {
  const source = profile?.profile || profile || {};

  let score = 0;
  const missing: MissingProfileItem[] = [];

  const hasResume = Boolean(source.resumeUrl);
  const hasSkills = Array.isArray(source.skills) && source.skills.length > 0;
  const hasExperience = Array.isArray(source.experience) && source.experience.length > 0;

  if (hasResume) score += 40;
  else missing.push({ label: 'Resume', path: '/profile#resume' });

  if (hasSkills) score += 30;
  else missing.push({ label: 'Skills', path: '/profile#skills' });

  if (hasExperience) score += 30;
  else missing.push({ label: 'Experience', path: '/profile#experience' });

  return {
    percent: score,
    isComplete: score === 100,
    missing,
  };
};

export const getRecruiterProfileCompletion = (profile: any): RoleProfileCompletion => {
  const source = profile?.profile || profile || {};
  let score = 0;
  const missing: MissingProfileItem[] = [];

  if (isFilled(source.companyName)) score += 30;
  else missing.push({ label: 'Company Name', path: '/profile' });

  if (isFilled(source.companyDescription) || isFilled(source.bio)) score += 30;
  else missing.push({ label: 'Company Description', path: '/profile' });

  if (isFilled(source.website)) score += 20;
  else missing.push({ label: 'Website', path: '/profile' });

  if (isFilled(source.location)) score += 10;
  else missing.push({ label: 'Location', path: '/profile' });

  if (isFilled(source.phone)) score += 10;
  else missing.push({ label: 'Phone', path: '/profile' });

  return {
    percent: score,
    isComplete: score === 100,
    missing,
  };
};

export const getAdminProfileCompletion = (profile: any): RoleProfileCompletion => {
  const source = profile?.profile || profile || {};
  let score = 0;
  const missing: MissingProfileItem[] = [];

  if (isFilled(source.firstName)) score += 20;
  else missing.push({ label: 'First Name', path: '/profile' });

  if (isFilled(source.lastName)) score += 20;
  else missing.push({ label: 'Last Name', path: '/profile' });

  if (isFilled(source.bio)) score += 25;
  else missing.push({ label: 'Bio', path: '/profile' });

  if (isFilled(source.location)) score += 20;
  else missing.push({ label: 'Location', path: '/profile' });

  if (isFilled(source.phone)) score += 15;
  else missing.push({ label: 'Phone', path: '/profile' });

  return {
    percent: score,
    isComplete: score === 100,
    missing,
  };
};

export const getProfileCompletionByRole = (profile: any, role?: string): RoleProfileCompletion => {
  if (role === 'jobseeker') return getJobseekerProfileCompletion(profile);
  if (role === 'recruiter') return getRecruiterProfileCompletion(profile);
  if (role === 'admin') return getAdminProfileCompletion(profile);

  return {
    percent: 0,
    isComplete: false,
    missing: [],
  };
};
