// src/components/icons.tsx
// Re-exports every Lucide icon used in this project, each wrapped in a
// <span translate="no"> so Google Translate can't corrupt the SVG DOM.
// Style: display:contents makes the span invisible to flex/grid layout.
// Usage: import { Mail, Lock } from './icons'  (same API as lucide-react)

import React from 'react';
import {
  Activity as _Activity,
  AlertCircle as _AlertCircle,
  AlertTriangle as _AlertTriangle,
  ArrowLeft as _ArrowLeft,
  ArrowRight as _ArrowRight,
  Award as _Award,
  BadgeCheck as _BadgeCheck,
  Bell as _Bell,
  BookOpen as _BookOpen,
  BookX as _BookX,
  Bot as _Bot,
  Briefcase as _Briefcase,
  Building2 as _Building2,
  Calendar as _Calendar,
  CalendarCheck as _CalendarCheck,
  Camera as _Camera,
  Check as _Check,
  CheckCircle as _CheckCircle,
  ChevronLeft as _ChevronLeft,
  ChevronRight as _ChevronRight,
  ClipboardList as _ClipboardList,
  Clock as _Clock,
  Copy as _Copy,
  CreditCard as _CreditCard,
  Database as _Database,
  ExternalLink as _ExternalLink,
  Eye as _Eye,
  EyeOff as _EyeOff,
  Facebook as _Facebook,
  FileCheck as _FileCheck,
  FileText as _FileText,
  FlipHorizontal as _FlipHorizontal,
  Globe as _Globe,
  GraduationCap as _GraduationCap,
  HandHelping as _HandHelping,
  Handshake as _Handshake,
  Hash as _Hash,
  Info as _Info,
  Instagram as _Instagram,
  Key as _Key,
  KeyRound as _KeyRound,
  Landmark as _Landmark,
  LayoutGrid as _LayoutGrid,
  Linkedin as _Linkedin,
  Loader2 as _Loader2,
  Lock as _Lock,
  LogOut as _LogOut,
  Mail as _Mail,
  MapPin as _MapPin,
  Medal as _Medal,
  Megaphone as _Megaphone,
  Menu as _Menu,
  Mic as _Mic,
  Minimize2 as _Minimize2,
  Moon as _Moon,
  Pencil as _Pencil,
  Phone as _Phone,
  Plus as _Plus,
  Power as _Power,
  QrCode as _QrCode,
  RefreshCw as _RefreshCw,
  Scan as _Scan,
  Search as _Search,
  Send as _Send,
  Settings as _Settings,
  Shield as _Shield,
  ShieldCheck as _ShieldCheck,
  ShieldX as _ShieldX,
  SlidersHorizontal as _SlidersHorizontal,
  Smartphone as _Smartphone,
  Sparkles as _Sparkles,
  Star as _Star,
  Sun as _Sun,
  Table2 as _Table2,
  Target as _Target,
  Ticket as _Ticket,
  Trash2 as _Trash2,
  TrendingUp as _TrendingUp,
  Trophy as _Trophy,
  Upload as _Upload,
  User as _User,
  UserCheck as _UserCheck,
  UserCircle as _UserCircle,
  UserCog as _UserCog,
  UserPlus as _UserPlus,
  Users as _Users,
  UsersRound as _UsersRound,
  X as _X,
  XCircle as _XCircle,
} from 'lucide-react';

// Also re-export the LucideIcon type and LucideProps for any files that need them
export type { LucideProps, LucideIcon } from 'lucide-react';

type LucideIconComponent = React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number; absoluteStrokeWidth?: boolean; }>;

const wrap = (Icon: LucideIconComponent): LucideIconComponent => {
  const Wrapped: LucideIconComponent = (props) => (
    <span translate="no" style={{ display: 'contents' }}>
      <Icon {...props} />
    </span>
  );
  Wrapped.displayName = (Icon as any).displayName || Icon.name;
  return Wrapped;
};

export const Activity        = wrap(_Activity);
export const AlertCircle     = wrap(_AlertCircle);
export const AlertTriangle   = wrap(_AlertTriangle);
export const ArrowLeft       = wrap(_ArrowLeft);
export const ArrowRight      = wrap(_ArrowRight);
export const Award           = wrap(_Award);
export const BadgeCheck      = wrap(_BadgeCheck);
export const Bell            = wrap(_Bell);
export const BookOpen        = wrap(_BookOpen);
export const BookX           = wrap(_BookX);
export const Bot             = wrap(_Bot);
export const Briefcase       = wrap(_Briefcase);
export const Building2       = wrap(_Building2);
export const Calendar        = wrap(_Calendar);
export const CalendarCheck   = wrap(_CalendarCheck);
export const Camera          = wrap(_Camera);
export const Check           = wrap(_Check);
export const CheckCircle     = wrap(_CheckCircle);
export const ChevronLeft     = wrap(_ChevronLeft);
export const ChevronRight    = wrap(_ChevronRight);
export const ClipboardList   = wrap(_ClipboardList);
export const Clock           = wrap(_Clock);
export const Copy            = wrap(_Copy);
export const CreditCard      = wrap(_CreditCard);
export const Database        = wrap(_Database);
export const ExternalLink    = wrap(_ExternalLink);
export const Eye             = wrap(_Eye);
export const EyeOff          = wrap(_EyeOff);
export const Facebook        = wrap(_Facebook);
export const FileCheck       = wrap(_FileCheck);
export const FileText        = wrap(_FileText);
export const FlipHorizontal  = wrap(_FlipHorizontal);
export const Globe           = wrap(_Globe);
export const GraduationCap   = wrap(_GraduationCap);
export const HandHelping     = wrap(_HandHelping);
export const Handshake       = wrap(_Handshake);
export const Hash            = wrap(_Hash);
export const Info            = wrap(_Info);
export const Instagram       = wrap(_Instagram);
export const Key             = wrap(_Key);
export const KeyRound        = wrap(_KeyRound);
export const Landmark        = wrap(_Landmark);
export const LayoutGrid      = wrap(_LayoutGrid);
export const Linkedin        = wrap(_Linkedin);
export const Loader2         = wrap(_Loader2);
export const Lock            = wrap(_Lock);
export const LogOut          = wrap(_LogOut);
export const Mail            = wrap(_Mail);
export const MapPin          = wrap(_MapPin);
export const Medal           = wrap(_Medal);
export const Megaphone       = wrap(_Megaphone);
export const Menu            = wrap(_Menu);
export const Mic             = wrap(_Mic);
export const Minimize2       = wrap(_Minimize2);
export const Moon            = wrap(_Moon);
export const Pencil          = wrap(_Pencil);
export const Phone           = wrap(_Phone);
export const Plus            = wrap(_Plus);
export const Power           = wrap(_Power);
export const QrCode          = wrap(_QrCode);
export const RefreshCw       = wrap(_RefreshCw);
export const Scan            = wrap(_Scan);
export const Search          = wrap(_Search);
export const Send            = wrap(_Send);
export const Settings        = wrap(_Settings);
export const Shield          = wrap(_Shield);
export const ShieldCheck     = wrap(_ShieldCheck);
export const ShieldX         = wrap(_ShieldX);
export const SlidersHorizontal = wrap(_SlidersHorizontal);
export const Smartphone      = wrap(_Smartphone);
export const Sparkles        = wrap(_Sparkles);
export const Star            = wrap(_Star);
export const Sun             = wrap(_Sun);
export const Table2          = wrap(_Table2);
export const Target          = wrap(_Target);
export const Ticket          = wrap(_Ticket);
export const Trash2          = wrap(_Trash2);
export const TrendingUp      = wrap(_TrendingUp);
export const Trophy          = wrap(_Trophy);
export const Upload          = wrap(_Upload);
export const User            = wrap(_User);
export const UserCheck       = wrap(_UserCheck);
export const UserCircle      = wrap(_UserCircle);
export const UserCog         = wrap(_UserCog);
export const UserPlus        = wrap(_UserPlus);
export const Users           = wrap(_Users);
export const UsersRound      = wrap(_UsersRound);
export const X               = wrap(_X);
export const XCircle         = wrap(_XCircle);
