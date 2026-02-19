//constants.ts
export const FACULTIES = [
  'Faculty of Business',
  'Faculty of Engineering',
  'Faculty of Medicine',
  'Faculty of Science',
  'Faculty of Pharmacy',
  'Faculty of Computer and Information Sciences',
  'Faculty of Dentistry',
  'Faculty of Al-Alsun',
  'Faculty of Education',
  'Faculty of Law',
  'Faculty of Agriculture',
  'Faculty of Specific Education',
  'Faculty of Women',
  'Faculty of Arts',
  'Faculty of Nursing',
  'Faculty of Postgraduate Childhood Studies',
  'Faculty of Graduate Studies and Environment Research',
  'Faculty of Archaeology',
  'Faculty of Arid Land Agricultural Research Institute',
  'Faculty of Veterinary Medicine',
  'Faculty of Media and Mass Communication',
  'Other'
];
export const ENUM_VALUES = {
  GENDER: ['male', 'female'] as const,
  DEGREE_LEVEL: ['student', 'graduate'] as const,
  CLASS_LEVEL: ['1', '2', '3', '4', '5'] as const,
  MARKETING_SOURCE: [
    'linkedin', 'facebook', 'instagram', 'friends',
    'banners_in_street', 'information_session_at_faculty',
    'campus_marketing', 'other'
  ] as const,
  USER_ROLE: [
    'admin', 'team_leader', 'registration', 'building',
    'attendee', 'volunteer', 'info_desk'
  ] as const
};


export const CLASS_YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' }
];

export const HOW_DID_YOU_HEAR_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'friends', label: 'Friends' },
  { value: 'banners_in_street', label: 'Banners in Street' },
  { value: 'information_session_at_faculty', label: 'Information Session at Faculty' },
  { value: 'campus_marketing', label: 'Campus Marketing' },
  { value: 'other', label: 'Other' }
];

export const UNIVERSITIES = [
  'Ain Shams University',
  'Other'
];