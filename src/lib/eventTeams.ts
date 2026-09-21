// Volunteer team options for the current event, built from the database instead of
// fixed team IDs. Staff roles are linked to their team by name.
//
// In v2 every event has its own volunteer_teams rows, so the same team name has a
// different id per event. Hard-coded ids cannot work here.
import { getCurrentEventTeams } from './currentEvent';

const norm = (value: string) => value.trim().toLowerCase();

const TEAM_ICONS: Record<string, string> = {
  registration: 'how_to_reg',
  building: 'construction',
  verification: 'verified_user',
  'technical support': 'support_agent',
  catering: 'restaurant',
  er: 'local_hospital',
  feedback: 'rate_review',
  marketing: 'campaign',
  media: 'camera',
  stage: 'theater_comedy',
  usher: 'waving_hand'
};

// Roles that belong to exactly one team.
const NAMED_ROLES = [
  { role: 'building', team: 'building', label: 'Building' },
  { role: 'registration', team: 'registration', label: 'Registration' },
  { role: 'verification', team: 'verification', label: 'Verification' },
  { role: 'tech_support', team: 'technical support', label: 'Technical Support' }
];

export interface RoleTeamOption {
  role: string;
  teamId: string;
  label: string;
  icon: string;
}

export const teamOptions = (teams?: { id: string; team_name: string }[]): { id: string; name: string }[] =>
  (teams || getCurrentEventTeams()).map((t) => ({ id: t.id, name: t.team_name }));

export const namedRoleOptions = (includeAdmin = false, teams?: { id: string; team_name: string }[]): RoleTeamOption[] => {
  const eventTeams = teams || getCurrentEventTeams();
  const find = (name: string) => eventTeams.find((t) => norm(t.team_name) === name);
  const options: RoleTeamOption[] = [];
  for (const r of NAMED_ROLES) {
    const team = find(r.team);
    if (team) options.push({ role: r.role, teamId: team.id, label: r.label, icon: TEAM_ICONS[r.team] ?? 'groups' });
  }
  if (includeAdmin) {
    const tech = find('technical support');
    if (tech) options.push({ role: 'admin', teamId: tech.id, label: 'Admin', icon: 'shield_person' });
  }
  return options;
};

export const volunteerTeamOptions = (teams?: { id: string; team_name: string }[]): RoleTeamOption[] => {
  const named = new Set(NAMED_ROLES.map((r) => r.team));
  return (teams || getCurrentEventTeams())
    .filter((t) => !named.has(norm(t.team_name)))
    .map((t) => ({ role: 'volunteer', teamId: t.id, label: t.team_name, icon: TEAM_ICONS[norm(t.team_name)] ?? 'groups' }));
};
