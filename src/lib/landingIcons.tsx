// Icons a super admin can pick for the landing page cards.
import React from 'react';
import {
  Award, Bell, BookOpen, Briefcase, Building2, Calendar, CalendarCheck, Camera, CheckCircle, Clock,
  FileText, Globe, GraduationCap, Handshake, Landmark, MapPin, Medal, Megaphone, Mic, QrCode,
  Settings, Sparkles, Star, Target, Ticket, TrendingUp, Trophy, UserCheck, Users, UsersRound
} from '../components/icons';

// Same shape as the wrapped icons in components/icons.tsx.
export type IconComponent = React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number }>;

export const LANDING_ICONS: { key: string; label: string; Icon: IconComponent }[] = [
  { key: 'briefcase', label: 'Briefcase', Icon: Briefcase },
  { key: 'award', label: 'Award', Icon: Award },
  { key: 'calendar', label: 'Calendar', Icon: Calendar },
  { key: 'calendar_check', label: 'Calendar with tick', Icon: CalendarCheck },
  { key: 'users', label: 'People', Icon: Users },
  { key: 'users_round', label: 'Group', Icon: UsersRound },
  { key: 'graduation', label: 'Graduation cap', Icon: GraduationCap },
  { key: 'handshake', label: 'Handshake', Icon: Handshake },
  { key: 'target', label: 'Target', Icon: Target },
  { key: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { key: 'clock', label: 'Clock', Icon: Clock },
  { key: 'map_pin', label: 'Location pin', Icon: MapPin },
  { key: 'ticket', label: 'Ticket', Icon: Ticket },
  { key: 'settings', label: 'Gear', Icon: Settings },
  { key: 'star', label: 'Star', Icon: Star },
  { key: 'trophy', label: 'Trophy', Icon: Trophy },
  { key: 'medal', label: 'Medal', Icon: Medal },
  { key: 'building', label: 'Building', Icon: Building2 },
  { key: 'file', label: 'Document', Icon: FileText },
  { key: 'globe', label: 'Globe', Icon: Globe },
  { key: 'megaphone', label: 'Megaphone', Icon: Megaphone },
  { key: 'mic', label: 'Microphone', Icon: Mic },
  { key: 'camera', label: 'Camera', Icon: Camera },
  { key: 'book', label: 'Book', Icon: BookOpen },
  { key: 'check', label: 'Tick', Icon: CheckCircle },
  { key: 'trending', label: 'Growth', Icon: TrendingUp },
  { key: 'landmark', label: 'Landmark', Icon: Landmark },
  { key: 'bell', label: 'Bell', Icon: Bell },
  { key: 'qr', label: 'QR code', Icon: QrCode },
  { key: 'user_check', label: 'Verified person', Icon: UserCheck }
];

const BY_KEY: Record<string, IconComponent> = Object.fromEntries(LANDING_ICONS.map((i) => [i.key, i.Icon]));

/** Falls back to the given icon key, then to a briefcase, so a bad value never breaks the page. */
export const landingIcon = (key: string | undefined, fallback = 'briefcase'): IconComponent =>
  BY_KEY[key ?? ''] ?? BY_KEY[fallback] ?? Briefcase;
