import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, X, Plus, Trash2, Pencil, Check, Loader2,
  Database, Users, Table2, ChevronLeft, ChevronRight,
  AlertTriangle, Power, UserCog, Calendar, MapPin,
  UserCheck, ClipboardList, Mic, CalendarCheck, Building2,
  Briefcase, FileText, UsersRound, HandHelping,
  Activity, Clock, Bell, LayoutGrid, Star, Settings,
  Shield, Info, CheckCircle, ExternalLink,
  Eye, EyeOff, SlidersHorizontal, ShieldCheck, Smartphone,
  Camera, Scan, Key, LogOut
} from '../../components/icons';
import * as faceapi from '@vladmandic/face-api';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/shared/Toast';
import { logger } from '../../utils/logger';

let faceModelsPromise: Promise<void> | null = null;
const ensureModelsLoaded = (): Promise<void> => {
  if (!faceModelsPromise) {
    faceModelsPromise = (async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
    })().catch(err => {
      faceModelsPromise = null;
      throw err;
    });
  }
  return faceModelsPromise;
};
const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

// Icon map for Overview tab table cards
const tableIconMap: Record<string, typeof Users> = {
  user_profiles: Users,
  user_roles: UserCog,
  events: Calendar,
  event_maps: MapPin,
  attendees: UserCheck,
  attendee_attendance: ClipboardList,
  speaker: Mic,
  sessions: CalendarCheck,
  session_bookings: CalendarCheck,
  companies: Building2,
  employer: Briefcase,
  job_positions: FileText,
  job_applications: FileText,
  volunteer_teams: UsersRound,
  volunteers: HandHelping,
  user_activities: Activity,
  volunteer_attendance: Clock,
  notifications: Bell,
  schedule: LayoutGrid,
  points_config: Star,
  system_config: Settings,
};

const VALID_ROLES = [
  'admin', 'sadmin', 'attendee', 'team_leader', 'employer',
  'volunteer', 'building', 'registration', 'info_desk', 'verification'
] as const;

const ROLE_COLORS: Record<string, string> = {
  sadmin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  team_leader: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  attendee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  volunteer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  employer: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  building: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  registration: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  info_desk: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  verification: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

interface DbTableStat {
  table_name: string;
  row_count: number;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  personal_id: string;
  nationality: string;
  score: number;
  role: string;
  user_type: string;
  created_at: string;
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  exit: { opacity: 0 },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const SuperAdminPanel: React.FC = () => {
  const { user, signOut } = useAuth();

  const navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'users', label: 'Users', icon: 'group' },
    { key: 'tables', label: 'Table Browser', icon: 'table_chart' },
    { key: 'security', label: 'Security', icon: 'security' },
    { key: 'dashboards', label: 'Dashboards', icon: 'apps' },
  ];

  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ show: false, message: '', type: 'info' });

  // ===== OVERVIEW STATE =====
  const [dbStats, setDbStats] = useState<DbTableStat[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sadmin_hidden_tables');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // ===== OVERVIEW INLINE TABLE STATE =====
  const [overviewSelectedTable, setOverviewSelectedTable] = useState<string | null>(null);
  const [overviewTableData, setOverviewTableData] = useState<any[]>([]);
  const [overviewTableTotal, setOverviewTableTotal] = useState(0);
  const [overviewTablePage, setOverviewTablePage] = useState(0);
  const [isLoadingOverviewTable, setIsLoadingOverviewTable] = useState(false);
  const [overviewSearchQuery, setOverviewSearchQuery] = useState('');
  const OVERVIEW_PAGE_SIZE = 20;

  // Overview inline edit/add/delete
  const [overviewEditingRow, setOverviewEditingRow] = useState<any | null>(null);
  const [overviewEditForm, setOverviewEditForm] = useState<Record<string, string>>({});
  const [isSubmittingOverviewEdit, setIsSubmittingOverviewEdit] = useState(false);
  const [overviewShowAddRow, setOverviewShowAddRow] = useState(false);
  const [overviewAddForm, setOverviewAddForm] = useState<Record<string, string>>({});
  const [isSubmittingOverviewAdd, setIsSubmittingOverviewAdd] = useState(false);
  const [overviewRowToDelete, setOverviewRowToDelete] = useState<any | null>(null);
  const [isDeletingOverviewRow, setIsDeletingOverviewRow] = useState(false);

  // ===== USERS STATE (paginated) =====
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ user: UserRow; newRole: string } | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const USERS_PAGE_SIZE = 20;



  // ===== TABLE BROWSER STATE =====
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(0);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const PAGE_SIZE = 20;

  // Edit row state
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Add row state
  const [showAddRow, setShowAddRow] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, string>>({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Delete row state
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [isDeletingRow, setIsDeletingRow] = useState(false);

  // ===== MAINTENANCE MODE STATE =====
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  // ===== SECURITY / BIOMETRICS STATE =====
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null);
  const [activeBiometricType, setActiveBiometricType] = useState<'face' | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(false);
  const [isRegisteringBiometrics, setIsRegisteringBiometrics] = useState(false);
  const [isDeletingBiometrics, setIsDeletingBiometrics] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRegChoices, setShowRegChoices] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [useSecretKeyFallback, setUseSecretKeyFallback] = useState(false);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [newSecretKeyInput, setNewSecretKeyInput] = useState('');
  const [isUpdatingSecretKey, setIsUpdatingSecretKey] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ===== FETCH FUNCTIONS =====
  const fetchDbStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_get_db_stats');
      if (error) throw error;
      setDbStats(data || []);
    } catch (err: any) {
      logger.error('Error fetching DB stats:', err);
      setToast({ show: true, message: err.message || 'Failed to load stats', type: 'error' });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page: number = 0, search: string = '') => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_list_users_paginated', {
        _event_id: EVENT_ID,
        _limit: USERS_PAGE_SIZE,
        _offset: page * USERS_PAGE_SIZE,
        _search_term: search.trim(),
      });
      if (error) throw error;
      if (data?.success) {
        setUsers(data.data || []);
        setUsersTotal(data.total || 0);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      logger.error('Error fetching users:', err);
      setToast({ show: true, message: err.message || 'Failed to load users', type: 'error' });
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Debounced search effect — triggers server-side search
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => {
      setUsersPage(0);
      fetchUsers(0, userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, activeTab, fetchUsers]);



  const fetchTableData = useCallback(async (tableName: string, page: number) => {
    setIsLoadingTable(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_get_table_data', {
        _table_name: tableName,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      if (data?.success) {
        setTableData(data.data || []);
        setTableTotal(data.total || 0);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      logger.error('Error fetching table data:', err);
      setToast({ show: true, message: err.message || 'Failed to load table', type: 'error' });
    } finally {
      setIsLoadingTable(false);
    }
  }, []);

  // ===== OVERVIEW TABLE FETCH (20 per page) =====
  const fetchOverviewTableData = useCallback(async (tableName: string, page: number) => {
    setIsLoadingOverviewTable(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_get_table_data', {
        _table_name: tableName,
        _limit: OVERVIEW_PAGE_SIZE,
        _offset: page * OVERVIEW_PAGE_SIZE,
      });
      if (error) throw error;
      if (data?.success) {
        setOverviewTableData(data.data || []);
        setOverviewTableTotal(data.total || 0);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      logger.error('Error fetching overview table data:', err);
      setToast({ show: true, message: err.message || 'Failed to load table', type: 'error' });
    } finally {
      setIsLoadingOverviewTable(false);
    }
  }, []);

  // ===== TABLE VISIBILITY =====
  const toggleTableVisibility = (tableName: string) => {
    setHiddenTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      localStorage.setItem('sadmin_hidden_tables', JSON.stringify([...next]));
      return next;
    });
  };

  const showAllTables = () => {
    setHiddenTables(new Set());
    localStorage.removeItem('sadmin_hidden_tables');
  };

  // ===== OVERVIEW CRUD HANDLERS =====
  const handleOverviewEditRow = (row: any) => {
    setOverviewEditingRow(row);
    const form: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      form[key] = value === null ? '' : String(value);
    });
    setOverviewEditForm(form);
  };

  const handleOverviewSaveEdit = async () => {
    if (!overviewEditingRow || !overviewSelectedTable) return;
    setIsSubmittingOverviewEdit(true);
    try {
      const pk = Object.keys(overviewEditingRow)[0];
      const pkValue = overviewEditingRow[pk];
      const changes: Record<string, any> = {};
      Object.entries(overviewEditForm).forEach(([key, value]) => {
        if (key !== pk && String(overviewEditingRow[key] ?? '') !== value) {
          changes[key] = value === '' ? null : value;
        }
      });
      if (Object.keys(changes).length === 0) { setOverviewEditingRow(null); return; }
      const { data, error } = await supabase.rpc('sadmin_execute_write', {
        _table_name: overviewSelectedTable, _operation: 'update', _row_data: changes, _row_id: String(pkValue),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to update');
      setToast({ show: true, message: 'Row updated successfully', type: 'success' });
      setOverviewEditingRow(null);
      fetchOverviewTableData(overviewSelectedTable, overviewTablePage);
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to update row', type: 'error' });
    } finally { setIsSubmittingOverviewEdit(false); }
  };

  const handleOverviewAddRow = async () => {
    if (!overviewSelectedTable) return;
    setIsSubmittingOverviewAdd(true);
    try {
      const rowData: Record<string, any> = {};
      Object.entries(overviewAddForm).forEach(([key, value]) => {
        if (value.trim() !== '') rowData[key] = value;
      });
      const { data, error } = await supabase.rpc('sadmin_execute_write', {
        _table_name: overviewSelectedTable, _operation: 'insert', _row_data: rowData, _row_id: null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to insert');
      setToast({ show: true, message: 'Row added successfully', type: 'success' });
      setOverviewShowAddRow(false);
      setOverviewAddForm({});
      fetchOverviewTableData(overviewSelectedTable, overviewTablePage);
      fetchDbStats();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to add row', type: 'error' });
    } finally { setIsSubmittingOverviewAdd(false); }
  };

  const handleOverviewDeleteRow = async () => {
    if (!overviewRowToDelete || !overviewSelectedTable) return;
    setIsDeletingOverviewRow(true);
    try {
      const pk = Object.keys(overviewRowToDelete)[0];
      const pkValue = overviewRowToDelete[pk];
      const { data, error } = await supabase.rpc('sadmin_execute_write', {
        _table_name: overviewSelectedTable, _operation: 'delete', _row_data: {}, _row_id: String(pkValue),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete');
      setToast({ show: true, message: 'Row deleted successfully', type: 'success' });
      setOverviewRowToDelete(null);
      fetchOverviewTableData(overviewSelectedTable, overviewTablePage);
      fetchDbStats();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete row', type: 'error' });
    } finally { setIsDeletingOverviewRow(false); }
  };

  // ===== SECURITY / BIOMETRICS FETCH =====
  const checkBiometrics = useCallback(async () => {
    setIsCheckingBiometrics(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_has_biometric');
      if (error) throw error;
      setHasBiometric(data?.has_credentials || false);
      setActiveBiometricType(data?.biometric_type as 'face' | null);
    } catch (err: any) {
      logger.error('Error checking biometrics:', err);
    } finally {
      setIsCheckingBiometrics(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      logger.error('Camera access denied:', err);
      setToast({ show: true, message: 'Camera access denied', type: 'error' });
      setIsCameraActive(false);
      throw err;
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleRegisterBiometrics = useCallback(async (type: 'face') => {
    setIsRegisteringBiometrics(true);
    try {
      // 1. Create challenge for the row (face uses this as a nonce just to pass DB asserts)
      const { data: challengeData, error: challengeErr } = await supabase.rpc('sadmin_create_challenge', { _type: 'register' });
      if (challengeErr) throw challengeErr;
      if (!challengeData?.success) throw new Error(challengeData?.error || 'Failed to create challenge');

      // AI Face Recognition Registration Flow
      if (type === 'face') {
        if (!isModelsLoaded) {
          try {
            await ensureModelsLoaded();
            setIsModelsLoaded(true);
          } catch (err) {
            throw new Error("Face AI Models failed to load. Please check your internet connection.");
          }
        }
        if (!videoRef.current) throw new Error("Camera not active.");

        let descriptor: Float32Array | null = null;
        for (let i = 0; i < 6; i++) {
          const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
          if (det) {
            descriptor = det.descriptor;
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }

        if (!descriptor) {
          stopCamera();
          throw new Error("No face firmly detected. Please ensure you are clearly visible.");
        }

        const { error: faceRegErr } = await supabase.rpc('sadmin_register_credential', {
          p_challenge_id: challengeData.challenge_id,
          p_credential_id: `face-${Date.now()}`,
          p_public_key: JSON.stringify(Array.from(descriptor)),
          p_device_name: navigator.userAgent.split(')')[0].split('(')[1] || 'Unknown Device',
          p_biometric_type: 'face',
        });

        stopCamera();
        if (faceRegErr) throw faceRegErr;

        setToast({ show: true, message: 'Face Registration verified and saved!', type: 'success' });
        setShowRegChoices(false);
        checkBiometrics();
        return;
      }
    } catch (err: any) {
      // If we failed or cancelled, make sure camera is stopped
      stopCamera();
      if (err.name === 'NotAllowedError') {
        setToast({ show: true, message: 'Setup cancelled by user.', type: 'info' });
      } else {
        logger.error('Registration error:', err);
        setToast({ show: true, message: err.message || 'Registration failed', type: 'error' });
      }
    } finally {
      setIsRegisteringBiometrics(false);
    }
  }, [user, checkBiometrics, stopCamera]);

  const handleDeleteBiometrics = async () => {
    setIsDeletingBiometrics(true);
    try {
      if (activeBiometricType === 'face') {
        if (!isModelsLoaded) {
          try {
            await ensureModelsLoaded();
            setIsModelsLoaded(true);
          } catch (err) {
            throw new Error("Face AI Models failed to load. Please check your internet connection.");
          }
        }

        await startCamera();
        await new Promise(r => setTimeout(r, 1500));
        if (!videoRef.current) throw new Error("Camera inactive");

        let liveDescriptor: Float32Array | null = null;
        for (let i = 0; i < 6; i++) {
          const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
          if (det) {
            liveDescriptor = liveDescriptor || det.descriptor;
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }
        stopCamera();

        if (!liveDescriptor) throw new Error("Could not detect your face.");

        const { data: faceData, error: faceErr } = await supabase.rpc('sadmin_get_face_descriptor');
        if (faceErr || !faceData) throw new Error("Failed to retrieve face profile secure data.");

        let savedArray = faceData;
        if (typeof savedArray === 'string') {
          try { savedArray = JSON.parse(savedArray); } catch { /* ignore parse errors */ }
        }
        const savedDescriptor = new Float32Array(savedArray);
        const distance = faceapi.euclideanDistance(liveDescriptor, savedDescriptor);

        if (distance > 0.55) {
          throw new Error("Unauthorized. Face verification failed during removal.");
        }
      }

      const { data: creds } = await supabase.from('sadmin_webauthn_credentials').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      if (creds && creds.length > 0) {
        for (const cred of creds) {
          const { data: delData, error: delErr } = await supabase.rpc('sadmin_delete_credential', {
            _credential_id: cred.id
          });
          if (delErr) throw delErr;
          if (!delData?.success) throw new Error(delData?.error || 'Failed to delete credential');
        }
      }
      setToast({ show: true, message: 'Biometric credentials removed. You can now register new ones.', type: 'info' });
      setActiveBiometricType(null);
      setHasBiometric(false);
      setIsVerified(true); // Keep them verified so they aren't kicked out to the login screen
      setShowRegChoices(true); // Immediately show registration options
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to remove biometrics', type: 'error' });
    } finally {
      setIsDeletingBiometrics(false);
    }
  };

  const handleSecretKeyVerify = async () => {
    setIsVerifying(true);
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'sadmin_secret_key').maybeSingle();

      let isValid = false;

      if (data?.value?.key) {
        // Expected to be a SHA-256 hash or plaintext if legacy
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secretKeyInput));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        isValid = (hashedInput === data.value.key);
      } else {
        // No custom key in DB, use environment fallback (checked as plaintext)
        const expectedKey = import.meta.env.VITE_SUPER_ADMIN_RECOVERY_KEY || 'sadmin-recovery2026';
        isValid = (secretKeyInput === expectedKey);
      }

      if (isValid) {
        setIsVerified(true);
        if (hasBiometric === false) {
          setToast({ show: true, message: 'Verified via Secret Key. Please set up a Biometric ID in the Security Tab.', type: 'warning' });
        } else {
          setToast({ show: true, message: 'Verified via Secret Key fallback', type: 'success' });
        }
      } else {
        setToast({ show: true, message: 'Invalid Secret Key', type: 'error' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Error verifying secret key', type: 'error' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateSecretKey = async () => {
    if (!newSecretKeyInput || newSecretKeyInput.length < 8) {
      setToast({ show: true, message: 'Secret key must be at least 8 characters long', type: 'error' });
      return;
    }

    setIsUpdatingSecretKey(true);
    try {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(newSecretKeyInput));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.rpc('sadmin_execute_sql', {
        query: `INSERT INTO system_config (key, value) VALUES ('sadmin_secret_key', '{"key": "${hashedKey}"}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`
      });
      // Fallback if sadmin_execute_sql is not available or fails
      if (error) {
        const { error: insertError } = await supabase.from('system_config').upsert({
          key: 'sadmin_secret_key',
          value: { key: hashedKey }
        }, { onConflict: 'key' });
        if (insertError) throw insertError;
      }

      setToast({ show: true, message: 'Super Admin Secret Key updated successfully', type: 'success' });
      setNewSecretKeyInput('');
    } catch (err: any) {
      logger.error('Failed to update secret key', err);
      setToast({ show: true, message: err.message || 'Failed to update Secret Key', type: 'error' });
    } finally {
      setIsUpdatingSecretKey(false);
    }
  };

  const handleVerifyBiometrics = async () => {
    if (!hasBiometric) return;
    setIsVerifying(true);
    try {
      // Custom AI WebCam Verification
      if (activeBiometricType === 'face') {
        if (!isModelsLoaded) {
          try {
            await ensureModelsLoaded();
            setIsModelsLoaded(true);
          } catch (err) {
            throw new Error("Face AI Models failed to load. Please check your internet connection.");
          }
        }

        await startCamera();
        await new Promise(r => setTimeout(r, 1500)); // Let camera warm up
        if (!videoRef.current) throw new Error("Camera inactive");

        let liveDescriptor: Float32Array | null = null;
        for (let i = 0; i < 6; i++) {
          const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
          if (det) {
            liveDescriptor = det.descriptor;
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }

        stopCamera();

        if (!liveDescriptor) throw new Error("Could not detect your face. Ensure adequate lighting.");

        const { data: faceData, error: faceErr } = await supabase.rpc('sadmin_get_face_descriptor');
        if (faceErr || !faceData) throw new Error("Failed to retrieve face profile secure data.");

        let savedArray = faceData;
        if (typeof savedArray === 'string') {
          try {
            savedArray = JSON.parse(savedArray);
          } catch (e) {
            console.error(e);
          }
        }
        const savedDescriptor = new Float32Array(savedArray);

        const distance = faceapi.euclideanDistance(liveDescriptor, savedDescriptor);

        // Strict threshold to prevent false positives (0.55 acts as a highly confident match)
        if (distance > 0.55) {
          throw new Error("Unauthorized. Face verification failed.");
        }

        setIsVerified(true);
        setToast({ show: true, message: 'Face Verified Successfully', type: 'success' });
        return; // Done verification
      }
    } catch (err: any) {
      stopCamera(); // Ensure camera safety catch
      if (err.name === 'NotAllowedError') {
        setToast({ show: true, message: 'Verification cancelled', type: 'info' });
      } else {
        logger.error('Verification error:', err);
        setToast({ show: true, message: err.message || 'Verification failed', type: 'error' });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // ===== EFFECTS =====
  useEffect(() => {
    const loadModels = async () => {
      try {
        await ensureModelsLoaded();
        setIsModelsLoaded(true);
      } catch (err) {
        logger.error('Failed to load face models', err);
      }
    };
    loadModels();
  }, []);
  useEffect(() => {
    const init = async () => {
      await checkBiometrics();
    };
    init();
  }, [checkBiometrics]);

  useEffect(() => {
    // Prevent fetching sensitive data if the biometric lock is active
    if (hasBiometric === true && !isVerified) return;

    if (activeTab === 'overview' || activeTab === 'tables') fetchDbStats();
    if (activeTab === 'users') fetchUsers(usersPage, userSearchQuery);
    if (activeTab === 'security') checkBiometrics();
  }, [activeTab, fetchDbStats, fetchUsers, checkBiometrics, hasBiometric, isVerified, usersPage]);

  // Fetch maintenance status on mount
  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const { data } = await supabase.rpc('check_maintenance_status');
        setMaintenanceEnabled(data?.enabled || false);
      } catch { /* ignore */ }
    };
    fetchMaintenanceStatus();
  }, []);

  useEffect(() => {
    if (hasBiometric === true && !isVerified) return;
    if (selectedTable) {
      setTablePage(0);
      fetchTableData(selectedTable, 0);
    }
  }, [selectedTable, fetchTableData, hasBiometric, isVerified]);

  // ===== HANDLERS =====
  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    setIsChangingRole(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_update_user_role', {
        _event_id: EVENT_ID,
        _user_id: roleChangeTarget.user.id,
        _new_role: roleChangeTarget.newRole,
      });
      logger.log('Role change response:', { data, error });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to update role');
      setToast({ show: true, message: `Role updated to ${roleChangeTarget.newRole}`, type: 'success' });
      setRoleChangeTarget(null);
      fetchUsers(usersPage, userSearchQuery);
    } catch (err: any) {
      logger.error('Role change error:', err);
      setToast({ show: true, message: err.message || 'Failed to change role', type: 'error' });
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_delete_user', { _user_id: userToDelete.id });
      logger.log('Delete user response:', { data, error });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete user');
      setToast({ show: true, message: 'User deleted successfully', type: 'success' });
      setUserToDelete(null);
      fetchUsers(usersPage, userSearchQuery);
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete user', type: 'error' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setTablePage(newPage);
    if (selectedTable) fetchTableData(selectedTable, newPage);
  };

  const handleEditRow = (row: any) => {
    setEditingRow(row);
    const form: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      form[key] = value === null ? '' : String(value);
    });
    setEditForm(form);
  };

  const handleSaveEdit = async () => {
    if (!editingRow || !selectedTable) return;
    setIsSubmittingEdit(true);
    try {
      const pk = Object.keys(editingRow)[0];
      const pkValue = editingRow[pk];
      const changes: Record<string, any> = {};
      Object.entries(editForm).forEach(([key, value]) => {
        if (key !== pk && String(editingRow[key] ?? '') !== value) {
          changes[key] = value === '' ? null : value;
        }
      });
      if (Object.keys(changes).length === 0) {
        setEditingRow(null);
        return;
      }
      const { data, error } = await supabase.rpc('sadmin_execute_write', {
        _table_name: selectedTable,
        _operation: 'update',
        _row_data: changes,
        _row_id: String(pkValue),
      });
      logger.log('Edit row response:', { data, error });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to update');
      setToast({ show: true, message: 'Row updated successfully', type: 'success' });
      setEditingRow(null);
      fetchTableData(selectedTable, tablePage);
    } catch (err: any) {
      logger.error('Edit row error:', err);
      setToast({ show: true, message: err.message || 'Failed to update row', type: 'error' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleAddRow = async () => {
    if (!selectedTable) return;
    setIsSubmittingAdd(true);
    try {
      const rowData: Record<string, any> = {};
      Object.entries(addForm).forEach(([key, value]) => {
        if (value.trim() !== '') rowData[key] = value;
      });
      const { data, error } = await supabase.rpc('sadmin_execute_write', {
        _table_name: selectedTable,
        _operation: 'insert',
        _row_data: rowData,
        _row_id: null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to insert');
      setToast({ show: true, message: 'Row added successfully', type: 'success' });
      setShowAddRow(false);
      setAddForm({});
      fetchTableData(selectedTable, tablePage);
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to add row', type: 'error' });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleDeleteRow = async () => {
    if (!rowToDelete || !selectedTable) return;
    setIsDeletingRow(true);
    try {
      const pk = Object.keys(rowToDelete)[0];
      const pkValue = rowToDelete[pk];
      const { data, error } = await supabase.rpc('sadmin_execute_write', {
        _table_name: selectedTable,
        _operation: 'delete',
        _row_data: {},
        _row_id: String(pkValue),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete');
      setToast({ show: true, message: 'Row deleted successfully', type: 'success' });
      setRowToDelete(null);
      fetchTableData(selectedTable, tablePage);
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete row', type: 'error' });
    } finally {
      setIsDeletingRow(false);
    }
  };

  // ===== MAINTENANCE TOGGLE =====
  const handleToggleMaintenance = async () => {
    setIsTogglingMaintenance(true);
    try {
      const newState = !maintenanceEnabled;
      const { data, error } = await supabase.rpc('sadmin_toggle_maintenance', {
        _enabled: newState,
        _message: 'System is under maintenance. Please try again later.',
      });
      if (error) throw error;
      if (!data?.success) throw new Error('Failed to toggle maintenance');
      setMaintenanceEnabled(newState);
      setShowMaintenanceConfirm(false);
      setToast({ show: true, message: newState ? 'System frozen — all users blocked' : 'System restored — all users can access', type: newState ? 'warning' : 'success' });
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to toggle', type: 'error' });
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  // ===== FILTERED DATA =====
  // Users are now searched server-side, no client-side filtering needed
  const filteredUsers = users;

  const filteredTableData = tableData.filter(row => {
    if (!tableSearchQuery.trim()) return true;
    const q = tableSearchQuery.toLowerCase();
    return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(tableTotal / PAGE_SIZE);
  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
  const totalRows = (dbStats || []).reduce((sum, t) => sum + (t?.row_count || 0), 0);

  // Overview computed
  const visibleDbStats = dbStats.filter(t => !hiddenTables.has(t.table_name));
  const overviewColumns = (overviewTableData?.length || 0) > 0 && overviewTableData[0] ? Object.keys(overviewTableData[0]) : [];
  const overviewTotalPages = Math.ceil(overviewTableTotal / OVERVIEW_PAGE_SIZE);
  const filteredOverviewTableData = overviewTableData.filter(row => {
    if (!row) return false;
    if (!overviewSearchQuery.trim()) return true;
    const q = overviewSearchQuery.toLowerCase();
    return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q));
  });

  // Users computed
  const usersTotalPages = Math.ceil(usersTotal / USERS_PAGE_SIZE);



  // ===== SHARED STYLES =====
  const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";

  // ===== RENDER: OVERVIEW =====
  const renderOverview = () => {
    const openOverviewTable = (tableName: string) => {
      setOverviewSelectedTable(tableName);
      setOverviewTablePage(0);
      setOverviewSearchQuery('');
      fetchOverviewTableData(tableName, 0);
    };

    const handleOverviewPageChange = (newPage: number) => {
      setOverviewTablePage(newPage);
      if (overviewSelectedTable) fetchOverviewTableData(overviewSelectedTable, newPage);
    };

    return (
      <motion.div key="overview" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Database Overview</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {visibleDbStats.length} of {dbStats.length} tables shown · {totalRows.toLocaleString()} total rows
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={`px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm whitespace-nowrap border ${showConfigPanel
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Configure
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={fetchDbStats}
              disabled={isLoadingStats}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20 whitespace-nowrap disabled:opacity-50"
            >
              {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* Configure Tables Panel */}
        <AnimatePresence>
          {showConfigPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    Toggle Table Visibility
                  </h3>
                  <div className="flex gap-2">
                    {hiddenTables.size > 0 && (
                      <button
                        onClick={showAllTables}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 transition-colors"
                      >
                        Show All ({hiddenTables.size} hidden)
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {dbStats.map((stat) => {
                    const isHidden = hiddenTables.has(stat.table_name);
                    const Icon = tableIconMap[stat.table_name] || Table2;
                    return (
                      <motion.button
                        key={stat.table_name}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleTableVisibility(stat.table_name)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${isHidden
                          ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800 opacity-60'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 shadow-sm'
                          }`}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0 text-green-500" />}
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{stat.table_name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Maintenance Mode Card */}
        <motion.div variants={itemVariants}>
          <div className={`rounded-2xl p-5 shadow-sm border transition-all ${maintenanceEnabled
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${maintenanceEnabled
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                  <Power className={`w-6 h-6 ${maintenanceEnabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${maintenanceEnabled ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'
                    }`}>
                    {maintenanceEnabled ? 'System Frozen' : 'System Active'}
                  </h3>
                  <p className={`text-sm ${maintenanceEnabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                    {maintenanceEnabled ? 'All users are blocked from accessing the system' : 'All users can access the system normally'}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowMaintenanceConfirm(true)}
                disabled={isTogglingMaintenance}
                className={`px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-50 ${maintenanceEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                  }`}
              >
                {isTogglingMaintenance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {maintenanceEnabled ? 'Restore System' : 'Freeze System'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {isLoadingStats ? (
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
              <motion.div
                className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading database stats...</p>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleDbStats.map((stat, index) => {
              if (!stat) return null;
              const isSelected = overviewSelectedTable === stat.table_name;
              return (
                <motion.div
                  key={stat.table_name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                  whileHover={{ y: -3 }}
                  onClick={() => isSelected ? setOverviewSelectedTable(null) : openOverviewTable(stat.table_name)}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border cursor-pointer hover:shadow-md transition-all group ${isSelected
                    ? 'border-red-400 dark:border-red-600 ring-2 ring-red-500/20'
                    : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-red-100 dark:group-hover:bg-red-900/20'
                      }`}>
                      {(() => { const Icon = tableIconMap[stat.table_name] || Table2; return <Icon className={`w-5 h-5 transition-colors ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400'}`} />; })()}
                    </div>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{(stat.row_count || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{stat.table_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{isSelected ? 'click to close' : 'click to browse'}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Inline Table Data Viewer */}
        <AnimatePresence>
          {overviewSelectedTable && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Table header bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = tableIconMap[overviewSelectedTable] || Table2; return <Icon className="w-5 h-5 text-red-500" />; })()}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{overviewSelectedTable}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{overviewTableTotal} rows · Page {overviewTablePage + 1} of {overviewTotalPages || 1}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setOverviewShowAddRow(true);
                      const form: Record<string, string> = {};
                      if (overviewColumns.length) overviewColumns.forEach(c => { form[c] = ''; });
                      setOverviewAddForm(form);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Row
                  </motion.button>
                  <button
                    onClick={() => setOverviewSelectedTable(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${overviewSelectedTable}...`}
                  value={overviewSearchQuery}
                  onChange={(e) => setOverviewSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
                />
                {overviewSearchQuery && (
                  <button onClick={() => setOverviewSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Table */}
              {isLoadingOverviewTable ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative w-12 h-12 mb-3">
                    <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                    <motion.div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading data...</p>
                </div>
              ) : filteredOverviewTableData.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Table2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No data found</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                          {overviewColumns.map(col => (
                            <th key={col} className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{col}</th>
                          ))}
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 sticky right-0 bg-slate-50 dark:bg-slate-900/50">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOverviewTableData.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            {overviewColumns.map(col => (
                              <td key={col} className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={String(row[col] ?? '')}>
                                {row[col] === null ? <span className="text-slate-300 italic">null</span> : String(row[col])}
                              </td>
                            ))}
                            <td className="py-3 px-4 text-right whitespace-nowrap sticky right-0 bg-white dark:bg-slate-800">
                              <div className="flex items-center justify-end gap-1">
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleOverviewEditRow(row)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit row"
                                ><Pencil className="w-4 h-4" /></motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => setOverviewRowToDelete(row)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete row"
                                ><Trash2 className="w-4 h-4" /></motion.button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {overviewTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Page {overviewTablePage + 1} of {overviewTotalPages} · {overviewTableTotal} total rows · Showing {OVERVIEW_PAGE_SIZE} per page
                      </p>
                      <div className="flex gap-2">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleOverviewPageChange(overviewTablePage - 1)}
                          disabled={overviewTablePage === 0}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                        >
                          <ChevronLeft className="w-4 h-4" /> Previous
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleOverviewPageChange(overviewTablePage + 1)}
                          disabled={overviewTablePage >= overviewTotalPages - 1}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // ===== RENDER: USERS =====
  const renderUsers = () => (
    <motion.div key="users" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{usersTotal} users total · Page {usersPage + 1} of {usersTotalPages || 1}</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => fetchUsers(usersPage, userSearchQuery)}
          disabled={isLoadingUsers}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20 whitespace-nowrap disabled:opacity-50"
        >
          {isLoadingUsers ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
          Refresh
        </motion.button>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, personal ID, role..."
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
        />
        {userSearchQuery && (
          <button onClick={() => setUserSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </motion.div>

      {/* Users Table */}
      {isLoadingUsers ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading users...</p>
        </motion.div>
      ) : filteredUsers.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">{userSearchQuery ? 'No users match your search' : 'No users found'}</p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Personal ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Score</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{user.full_name || '—'}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{user.email || '—'}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{user.personal_id || '—'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role || ''}
                          onChange={(e) => setRoleChangeTarget({ user, newRole: e.target.value })}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}
                        >
                          {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{user.user_type}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{user.score}</td>
                      <td className="py-3 px-4 text-right">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setUserToDelete(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Users Pagination */}
          {usersTotalPages > 1 && (
            <motion.div variants={itemVariants} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {usersPage + 1} of {usersTotalPages} · {usersTotal} total users · Showing {USERS_PAGE_SIZE} per page
              </p>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { const newPage = usersPage - 1; setUsersPage(newPage); fetchUsers(newPage, userSearchQuery); }}
                  disabled={usersPage === 0}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { const newPage = usersPage + 1; setUsersPage(newPage); fetchUsers(newPage, userSearchQuery); }}
                  disabled={usersPage >= usersTotalPages - 1}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );



  // ===== RENDER: TABLE BROWSER =====
  const renderTableBrowser = () => (
    <motion.div key="tables" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Table2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Table Browser</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedTable ? `Viewing: ${selectedTable} (${tableTotal} rows)` : 'Select a table to browse'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedTable && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setShowAddRow(true);
                const form: Record<string, string> = {};
                if (columns.length) columns.forEach(c => { form[c] = ''; });
                setAddForm(form);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Row
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Table Selector */}
      <motion.div variants={itemVariants}>
        <select
          value={selectedTable || ''}
          onChange={(e) => { setSelectedTable(e.target.value || null); setTableSearchQuery(''); }}
          className={inputClass}
        >
          <option value="">— Select a table —</option>
          {dbStats.map(t => (
            <option key={t.table_name} value={t.table_name}>{t.table_name} ({t.row_count} rows)</option>
          ))}
        </select>
      </motion.div>

      {selectedTable && (
        <>
          {/* Search Bar */}
          <motion.div variants={itemVariants} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${selectedTable}...`}
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
            />
            {tableSearchQuery && (
              <button onClick={() => setTableSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </motion.div>

          {/* Table */}
          {isLoadingTable ? (
            <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                <motion.div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Loading {selectedTable}...</p>
            </motion.div>
          ) : filteredTableData.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Table2 className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No data found</p>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      {columns.map(col => (
                        <th key={col} className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{col}</th>
                      ))}
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 sticky right-0 bg-slate-50 dark:bg-slate-900/50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        {columns.map(col => (
                          <td key={col} className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={String(row[col] ?? '')}>
                            {row[col] === null ? <span className="text-slate-300 italic">null</span> : String(row[col])}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right whitespace-nowrap sticky right-0 bg-white dark:bg-slate-800">
                          <div className="flex items-center justify-end gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEditRow(row)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit row"
                            >
                              <Pencil className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setRowToDelete(row)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Page {tablePage + 1} of {totalPages} · {tableTotal} total rows · Showing {PAGE_SIZE} per page
                  </p>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(tablePage - 1)}
                      disabled={tablePage === 0}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(tablePage + 1)}
                      disabled={tablePage >= totalPages - 1}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );


  // ===== DASHBOARD NAVIGATION DATA =====
  const dashboardLinks = [
    { name: 'Admin Panel', route: '/secure-9821panel', icon: Shield, color: 'from-orange-500 to-red-600', description: 'Event management & admin controls' },
    { name: 'Attendee', route: '/attendee', icon: UserCheck, color: 'from-blue-500 to-indigo-600', description: 'Attendee dashboard experience' },
    { name: 'Volunteer', route: '/volunteer', icon: HandHelping, color: 'from-green-500 to-emerald-600', description: 'Volunteer tasks & attendance' },
    { name: 'Registration Team', route: '/registration', icon: ClipboardList, color: 'from-indigo-500 to-purple-600', description: 'Registration desk operations' },
    { name: 'Building Team', route: '/building', icon: Building2, color: 'from-cyan-500 to-blue-600', description: 'Building & setup management' },
    { name: 'Info Desk', route: '/info-desk', icon: Info, color: 'from-teal-500 to-cyan-600', description: 'Information desk support' },
    { name: 'Verification', route: '/verification', icon: CheckCircle, color: 'from-pink-500 to-rose-600', description: 'Attendee verification workflow' },
    { name: 'Team Leader', route: '/team-leader', icon: UsersRound, color: 'from-purple-500 to-violet-600', description: 'Team oversight & management' },
    { name: 'Employer', route: '/employer', icon: Briefcase, color: 'from-amber-500 to-orange-600', description: 'Employer dashboard & jobs' },
  ];

  // ===== RENDER: SECURITY =====
  const renderSecurity = () => (
    <motion.div key="security" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto py-8">
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-white relative overflow-hidden">
          <motion.div
            animate={{ rotate: [12, 15, 12], scale: [1.5, 1.55, 1.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 right-0 p-4 opacity-10"
          >
            <ShieldCheck size={120} />
          </motion.div>
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
            className="relative z-10 flex items-center gap-6"
          >
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg"
            >
              <ShieldCheck size={40} className="text-white drop-shadow-md" />
            </motion.div>
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight drop-shadow-sm">Security</h2>
            </div>
          </motion.div>
        </div>

        <div className="p-8 space-y-8">
          {/* Biometric Status */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-5">
              <motion.div
                whileHover={{ scale: 1.1, rotate: [-5, 5, -5, 0] }}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${hasBiometric && activeBiometricType === 'face'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                  : 'bg-slate-200 text-slate-400 dark:bg-slate-800'
                  }`}
              >
                {activeBiometricType === 'face' ? (
                  <Scan size={28} className={hasBiometric ? "animate-pulse" : ""} />
                ) : (
                  <Smartphone size={28} />
                )}
              </motion.div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">Biometric Credentials</h4>
                  {isCheckingBiometrics ? (
                    <div className="w-12 h-4 bg-slate-200 animate-pulse rounded-full" />
                  ) : hasBiometric ? (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                      className="bg-green-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                    >
                      Active ({activeBiometricType === 'face' ? 'Face ID' : 'Key'})
                    </motion.span>
                  ) : (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider">Not Setup</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hasBiometric
                    ? "FaceID login is active for this device."
                    : "Secure your account with faster, hardware-backed authentication."}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {hasBiometric ? (
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteBiometrics}
                  disabled={isDeletingBiometrics}
                  className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 font-bold text-sm shadow-sm hover:shadow-md hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center gap-2"
                >
                  {isDeletingBiometrics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove Credentials
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRegChoices(true)}
                  disabled={isRegisteringBiometrics}
                  className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] dark:shadow-none flex items-center gap-2 transition-all"
                >
                  {isRegisteringBiometrics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Sadmin Register
                </motion.button>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {showRegChoices && !hasBiometric && !isCameraActive && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-4 pb-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      await startCamera();
                      // Provide a short delay for the camera to warm up and the user to see the UI
                      setTimeout(() => handleRegisterBiometrics('face'), 2000);
                    }}
                    disabled={isRegisteringBiometrics}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                      <Camera size={32} className="text-slate-400 group-hover:text-orange-600 transition-colors" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">Face Recognition</span>
                    <span className="text-xs text-slate-500 mt-1">Use your laptop camera</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isCameraActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                className="relative w-64 h-64 mx-auto mb-12 mt-8 group"
              >
                {/* Ring Container */}
                <div className="absolute inset-0 rounded-full border-[6px] border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-125 grayscale-[0.2]" />
                </div>

                {/* Apple Style Scanning Borders */}
                <div className="absolute inset-[-10px] pointer-events-none">
                  <svg className="w-[calc(100%+20px)] h-[calc(100%+20px)] -rotate-90">
                    <motion.circle
                      cx="138"
                      cy="138"
                      r="132"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="830"
                      initial={{ strokeDashoffset: 830, opacity: 0 }}
                      animate={{
                        strokeDashoffset: isRegisteringBiometrics ? 0 : [830, 400, 0],
                        opacity: 1
                      }}
                      transition={{
                        duration: isRegisteringBiometrics ? 1.5 : 3.5,
                        repeat: isRegisteringBiometrics ? 0 : Infinity,
                        ease: "easeInOut"
                      }}
                      className="text-green-500"
                    />
                  </svg>
                </div>

                {/* Apple Style Corner Brackets (for Face ID feel) */}
                <div className="absolute inset-4 border-[1px] border-white/20 rounded-full" />

                {/* Laser Scan Line */}
                <motion.div
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-6 right-6 h-[2px] bg-green-400 blur-[1px] shadow-[0_0_15px_rgba(74,222,128,0.8)] z-10"
                />

                {/* Status Info */}
                <div className="absolute -bottom-8 left-0 right-0 flex flex-col items-center">
                  <div className="bg-slate-900/80 dark:bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                    <Scan size={14} className="text-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-white dark:text-slate-900 uppercase tracking-widest whitespace-nowrap">
                      {isModelsLoaded ? (isDeletingBiometrics ? 'Verifying Identity...' : isRegisteringBiometrics ? 'Finalizing Setup...' : 'AI Processing...') : 'Loading AI Engine...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Secret Key Configuration */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <Key size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Fallback Secret Key</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Set a custom fallback secret key. This key can be used to recover access to the Super Admin Dashboard if biometrics are lost or unavailable.
                </p>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="password"
                      placeholder="Enter new 8+ char secret key"
                      value={newSecretKeyInput}
                      onChange={(e) => setNewSecretKeyInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none pr-10"
                    />
                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateSecretKey}
                    disabled={isUpdatingSecretKey || !newSecretKeyInput || newSecretKeyInput.length < 8}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingSecretKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Key
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <Shield size={14} />
            Secure-Control-92K1X System
          </div>
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
            v2.4.0 Final
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // ===== RENDER: DASHBOARDS =====
  const renderDashboards = () => (
    <motion.div key="dashboards" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
          <LayoutGrid className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">All Dashboards</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Navigate to any dashboard — opens in a new tab
          </p>
        </div>
      </motion.div>

      {/* Dashboard Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboardLinks.map((dash, index) => {
          const Icon = dash.icon;
          return (
            <motion.div
              key={dash.route}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open(dash.route, '_blank')}
              className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-all group overflow-hidden"
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${dash.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${dash.color} flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dash.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{dash.description}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );

  // ===== MAIN RETURN =====
  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Super Admin"
    >
      <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-300 min-h-screen">

        {/* Biometric Verification Barrier */}
        <AnimatePresence>
          {hasBiometric !== null && !isVerified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden"
              >
                <div className={`w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center relative overflow-hidden transition-all duration-300 ${isCameraActive && activeBiometricType === 'face' ? 'bg-black ring-4 ring-blue-500/30' : 'bg-red-100 dark:bg-red-900/20'}`}>
                  {/* The face scanner video element for Verification */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0 absolute'}`}
                  />
                  {!isCameraActive && (
                    <ShieldCheck size={40} className="text-red-600 dark:text-red-400 absolute" />
                  )}
                  {isVerifying && activeBiometricType === 'face' && isCameraActive && (
                    <div className="absolute inset-0 bg-blue-500/10 z-10 animate-pulse border-2 border-blue-500 rounded-3xl" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Security Verification</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                  {useSecretKeyFallback || hasBiometric === false
                    ? "Enter your super admin secret key to recover access."
                    : `This panel is hardware-protected. Please verify your identity using your registered ${activeBiometricType === 'face' ? 'Face Recognition' : 'Face Recognition'}.`}
                </p>
                <div className="space-y-3">
                  {(useSecretKeyFallback || hasBiometric === false) ? (
                    <>
                      <input
                        type="password"
                        value={secretKeyInput}
                        onChange={(e) => setSecretKeyInput(e.target.value)}
                        placeholder="Enter Super Admin Secret Key"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSecretKeyVerify}
                        disabled={isVerifying}
                        className="w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                      >
                        {isVerifying ? <Loader2 className="animate-spin" /> : <Key className="w-6 h-6" />}
                        {isVerifying ? 'Verifying...' : 'Verify with Secret Key'}
                      </motion.button>
                      {hasBiometric === true && (
                        <button
                          onClick={() => setUseSecretKeyFallback(false)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors pt-2 block w-full text-center"
                        >
                          Back to Biometrics
                        </button>
                      )}
                    </>
                  ) : (
                    <div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleVerifyBiometrics}
                        disabled={isVerifying || (activeBiometricType === 'face' && !isModelsLoaded)}
                        className={`w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 ${activeBiometricType === 'face'
                          ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
                          : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                          }`}
                      >
                        {isVerifying || (activeBiometricType === 'face' && !isModelsLoaded) ? <Loader2 className="animate-spin" /> : activeBiometricType === 'face' ? <Scan size={24} /> : <Scan size={24} />}
                        {(activeBiometricType === 'face' && !isModelsLoaded) ? 'Loading AI Model...' : isVerifying ? 'Verifying...' : `Unlock with ${activeBiometricType === 'face' ? 'Face ID' : 'Face ID'}`}
                      </motion.button>
                      <button
                        onClick={() => setUseSecretKeyFallback(true)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pt-2 block w-full text-center"
                      >
                        Lost Credentials? Use Secret Key
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-[0.2em] pt-4">
                    Hardware-Protected Session
                  </p>
                  <button
                    onClick={signOut}
                    className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {(hasBiometric !== null && isVerified) && (
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'users' && renderUsers()}

              {activeTab === 'tables' && renderTableBrowser()}
              {activeTab === 'security' && renderSecurity()}
              {activeTab === 'dashboards' && renderDashboards()}
            </AnimatePresence>
          </div>
        )}

        {/* Delete User Confirm */}
        <AnimatePresence>
          {!!userToDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setUserToDelete(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/20"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete User</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{`Are you sure you want to permanently delete "${userToDelete?.full_name}"? This will remove all associated data and cannot be undone.`}</p>
                <div className="flex items-center gap-3 justify-end">
                  <button onClick={() => setUserToDelete(null)} disabled={isDeletingUser} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleDeleteUser} disabled={isDeletingUser} className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700">
                    {isDeletingUser && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role Change Confirm */}
        <AnimatePresence>
          {!!roleChangeTarget && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setRoleChangeTarget(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/20"><AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change User Role</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{`Change ${roleChangeTarget?.user.full_name}'s role from "${roleChangeTarget?.user.role}" to "${roleChangeTarget?.newRole}"?`}</p>
                <div className="flex items-center gap-3 justify-end">
                  <button onClick={() => setRoleChangeTarget(null)} disabled={isChangingRole} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleRoleChange} disabled={isChangingRole} className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700">
                    {isChangingRole && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Row Confirm */}
        <AnimatePresence>
          {!!rowToDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setRowToDelete(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/20"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Row</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{`Are you sure you want to delete this row from ${selectedTable}? This action cannot be undone.`}</p>
                <div className="flex items-center gap-3 justify-end">
                  <button onClick={() => setRowToDelete(null)} disabled={isDeletingRow} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleDeleteRow} disabled={isDeletingRow} className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700">
                    {isDeletingRow && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Row Modal — inlined so it doesn't re-mount on keystroke */}
        <AnimatePresence>
          {editingRow && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              onClick={() => setEditingRow(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-blue-500" /> Edit Row
                  </h3>
                  <button onClick={() => setEditingRow(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  {Object.entries(editForm).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className={inputClass}
                        disabled={key === Object.keys(editingRow)[0]}
                      />
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button onClick={() => setEditingRow(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} disabled={isSubmittingEdit} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-all disabled:opacity-50">
                    {isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Row Modal — inlined so it doesn't re-mount on keystroke */}
        <AnimatePresence>
          {showAddRow && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              onClick={() => setShowAddRow(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-500" /> Add Row to {selectedTable}
                  </h3>
                  <button onClick={() => setShowAddRow(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Leave fields blank for auto-generated values (like UUIDs or timestamps).</p>
                  {Object.entries(addForm).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className={inputClass}
                        placeholder={`Enter ${key}...`}
                      />
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button onClick={() => setShowAddRow(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleAddRow} disabled={isSubmittingAdd} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 flex items-center gap-2 transition-all disabled:opacity-50">
                    {isSubmittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Row
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Maintenance Mode Confirm */}
        <AnimatePresence>
          {showMaintenanceConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowMaintenanceConfirm(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!maintenanceEnabled ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                    <AlertTriangle className={`w-5 h-5 ${!maintenanceEnabled ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{maintenanceEnabled ? 'Restore System' : 'Freeze System'}</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{maintenanceEnabled ? 'This will restore access for all users immediately.' : 'This will block ALL users from accessing the system. Only you (Super Admin) can reverse this. Continue?'}</p>
                <div className="flex items-center gap-3 justify-end">
                  <button onClick={() => setShowMaintenanceConfirm(false)} disabled={isTogglingMaintenance} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleToggleMaintenance} disabled={isTogglingMaintenance} className={`px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50 ${!maintenanceEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isTogglingMaintenance && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Overview Edit Row Modal */}
        <AnimatePresence>
          {overviewEditingRow && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              onClick={() => setOverviewEditingRow(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-blue-500" /> Edit Row — {overviewSelectedTable}
                  </h3>
                  <button onClick={() => setOverviewEditingRow(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  {Object.entries(overviewEditForm).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setOverviewEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className={inputClass}
                        disabled={key === Object.keys(overviewEditingRow)[0]}
                      />
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button onClick={() => setOverviewEditingRow(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  <button onClick={handleOverviewSaveEdit} disabled={isSubmittingOverviewEdit} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-all disabled:opacity-50">
                    {isSubmittingOverviewEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Add Row Modal */}
        <AnimatePresence>
          {overviewShowAddRow && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              onClick={() => setOverviewShowAddRow(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-500" /> Add Row to {overviewSelectedTable}
                  </h3>
                  <button onClick={() => setOverviewShowAddRow(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Leave fields blank for auto-generated values (like UUIDs or timestamps).</p>
                  {Object.entries(overviewAddForm).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setOverviewAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className={inputClass}
                        placeholder={`Enter ${key}...`}
                      />
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button onClick={() => setOverviewShowAddRow(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  <button onClick={handleOverviewAddRow} disabled={isSubmittingOverviewAdd} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 flex items-center gap-2 transition-all disabled:opacity-50">
                    {isSubmittingOverviewAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Row
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Delete Row Confirm */}
        <AnimatePresence>
          {!!overviewRowToDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setOverviewRowToDelete(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/20"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Row</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{`Are you sure you want to delete this row from ${overviewSelectedTable}? This action cannot be undone.`}</p>
                <div className="flex items-center gap-3 justify-end">
                  <button onClick={() => setOverviewRowToDelete(null)} disabled={isDeletingOverviewRow} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleOverviewDeleteRow} disabled={isDeletingOverviewRow} className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700">
                    {isDeletingOverviewRow && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
        )}
      </div>
    </SharedNavigation>
  );
};
