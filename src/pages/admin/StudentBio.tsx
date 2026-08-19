import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  XMarkIcon,
  UserIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// ==================== Types ====================
interface Student {
  id: string;
  name: string;
  gender: string;
  dateOfBirth?: string;
  address?: string;
  admissionNumber?: string;
  classId?: string;
  armId?: string;
  class?: { id: string; name: string };
  arm?: { id: string; letter: string };
  parent?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  guardianRelationship?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface ArmOption {
  id: string;
  letter: string;
}

interface ParentOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface FeeRecord {
  id: string;
  term: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'unpaid';
}

interface AttendanceDetail {
  date: string;
  present: boolean;
}

interface SubjectResult {
  subject: string;
  score: number;
  grade: string;
  term: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
];

export default function StudentBio() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);

  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    name: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    admissionNumber: '',
  });
  const [personalSubmitting, setPersonalSubmitting] = useState(false);

  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [guardians, setGuardians] = useState<ParentOption[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [newGuardianForm, setNewGuardianForm] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'father',
  });
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianSubmitting, setGuardianSubmitting] = useState(false);

  const [showClassArmModal, setShowClassArmModal] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [arms, setArms] = useState<ArmOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [classArmLoading, setClassArmLoading] = useState(false);

  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);

  const [showAttendanceDetailModal, setShowAttendanceDetailModal] = useState(false);
  const [attendanceDetailList, setAttendanceDetailList] = useState<AttendanceDetail[]>([]);
  const [attendanceDetailTitle, setAttendanceDetailTitle] = useState('');

  // Dynamic data states
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [resultsData, setResultsData] = useState<SubjectResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // ========== Helper functions ==========
  const getClassName = useCallback(() => {
    if (student?.class?.name) return student.class.name;
    if (student?.classId && allClasses.length > 0) {
      const found = allClasses.find(c => c.id === student.classId);
      return found?.name || 'Not assigned';
    }
    return 'Not assigned';
  }, [student, allClasses]);

  const getArmLetter = useCallback(() => {
    if (student?.arm?.letter) return `Arm ${student.arm.letter}`;
    return 'Not assigned';
  }, [student]);

  // ========== API Calls ==========
  const fetchAllClasses = async () => {
    if (!token) return;
    try {
      const res = await api.get('/classes', token);
      if (res.ok) {
        const data = await res.json();
        setAllClasses(data);
        setClasses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudent = async () => {
    if (!token || !id) return;
    try {
      const res = await api.get(`/students/${id}`, token);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
      } else {
        toast.error('Failed to load student data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading student');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardians = async () => {
    if (!token) return;
    setGuardianLoading(true);
    try {
      const res = await api.get('/parents', token);
      if (res.ok) {
        const data = await res.json();
        setGuardians(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGuardianLoading(false);
    }
  };

  const fetchArms = async (classId: string) => {
    if (!token) return;
    try {
      const res = await api.get(`/arms/class/${classId}`, token);
      if (res.ok) {
        const data = await res.json();
        setArms(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendanceDetails = async (status: 'present' | 'absent') => {
    if (!token || !student) return;
    try {
      const res = await api.get(`/attendance/student/${student.id}`, token);
      if (res.ok) {
        const records: AttendanceDetail[] = await res.json();
        const filtered = records.filter(r => r.present === (status === 'present'));
        setAttendanceDetailList(filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setAttendanceDetailTitle(`${status === 'present' ? 'Present' : 'Absent'} Days (${filtered.length})`);
        setShowAttendanceDetailModal(true);
      } else {
        toast.error('Attendance details not available');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance details');
    }
  };

  const fetchSubjectsData = async () => {
    if (!token || !student) return;
    setSubjectsLoading(true);
    try {
      const [allRes, studentRes] = await Promise.all([
        api.get('/subjects', token),
        api.get(`/students/${student.id}/subjects`, token),
      ]);
      if (allRes.ok) setAllSubjects(await allRes.json());
      if (studentRes.ok) {
        const subs = await studentRes.json();
        setStudentSubjects(subs);
        setSelectedSubjectIds(new Set(subs.map((s: Subject) => s.id)));
      } else {
        setStudentSubjects([]);
        setSelectedSubjectIds(new Set());
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subjects');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchFeeRecords = async () => {
    if (!token || !student) return;
    setFeeLoading(true);
    try {
      const res = await api.get(`/students/${student.id}/fees`, token);
      if (res.ok) {
        const data = await res.json();
        setFeeRecords(data);
      } else {
        setFeeRecords([]);
      }
    } catch (err) {
      console.error(err);
      setFeeRecords([]);
    } finally {
      setFeeLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    if (!token || !student) return;
    setAttendanceLoading(true);
    try {
      const res = await api.get(`/attendance/student/${student.id}`, token);
      if (res.ok) {
        const records: AttendanceDetail[] = await res.json();
        const present = records.filter(r => r.present).length;
        const absent = records.filter(r => !r.present).length;
        const total = records.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        setAttendanceSummary({ present, absent, total, percentage });
      } else {
        setAttendanceSummary({ present: 0, absent: 0, total: 0, percentage: 0 });
      }
    } catch (err) {
      console.error(err);
      setAttendanceSummary({ present: 0, absent: 0, total: 0, percentage: 0 });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!token || !student) return;
    setResultsLoading(true);
    try {
      const res = await api.get(`/students/${student.id}/results`, token);
      if (res.ok) {
        const data = await res.json();
        setResultsData(data);
      } else {
        setResultsData([]);
      }
    } catch (err) {
      console.error(err);
      setResultsData([]);
    } finally {
      setResultsLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    const init = async () => {
      await fetchAllClasses();
      await fetchStudent();
    };
    init();
  }, [id, token]);

  useEffect(() => {
    if (student?.id) {
      fetchSubjectsData();
      fetchFeeRecords();
      fetchAttendanceSummary();
      fetchResults();
    }
  }, [student?.id, token]);

  // ========== Handlers ==========
  const updatePersonalInfo = async () => {
    if (!student || !token) return;
    setPersonalSubmitting(true);
    try {
      const res = await api.patch(`/students/${student.id}`, {
        name: personalForm.name,
        gender: personalForm.gender,
        dateOfBirth: personalForm.dateOfBirth || undefined,
        address: personalForm.address || undefined,
        admissionNumber: personalForm.admissionNumber || undefined,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Personal information updated');
      await fetchStudent();
      setShowPersonalModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPersonalSubmitting(false);
    }
  };

  const openPersonalModal = () => {
    if (student) {
      setPersonalForm({
        name: student.name || '',
        gender: student.gender || '',
        dateOfBirth: student.dateOfBirth || '',
        address: student.address || '',
        admissionNumber: student.admissionNumber || '',
      });
    }
    setShowPersonalModal(true);
  };

  const updateClassArm = async () => {
    if (!student || !token) return;
    setClassArmLoading(true);
    try {
      const res = await api.patch(`/students/${student.id}`, {
        classId: selectedClassId || undefined,
        armId: selectedArmId || undefined,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Class/Arm updated');
      await fetchStudent();
      setShowClassArmModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setClassArmLoading(false);
    }
  };

  const reassignGuardian = async () => {
    if (!student || !token) return;
    setGuardianSubmitting(true);
    try {
      let guardianId: string = '';
      if (newGuardianForm.name && newGuardianForm.email) {
        const createRes = await api.post('/parents', {
          name: newGuardianForm.name,
          email: newGuardianForm.email,
          phone: newGuardianForm.phone || '',
        }, token);
        if (!createRes.ok) throw new Error(await createRes.text());
        const newGuardian = await createRes.json();
        guardianId = newGuardian.id;
      } else if (selectedGuardianId) {
        guardianId = selectedGuardianId;
      }
      if (!guardianId) throw new Error('Please select or create a guardian');
      const updateRes = await api.patch(`/students/${student.id}`, {
        parentId: guardianId,
        guardianRelationship: newGuardianForm.relationship,
      }, token);
      if (!updateRes.ok) throw new Error(await updateRes.text());
      toast.success('Guardian assigned successfully');
      await fetchStudent();
      setShowGuardianModal(false);
      setSelectedGuardianId('');
      setNewGuardianForm({ name: '', email: '', phone: '', relationship: 'father' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardianSubmitting(false);
    }
  };

  const saveSubjectOfferings = async () => {
    if (!student || !token) return;
    setSavingSubjects(true);
    try {
      const payload = { subjectIds: Array.from(selectedSubjectIds) };
      const res = await api.put(`/students/${student.id}/subjects`, payload, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Subjects updated');
      await fetchSubjectsData();
      setShowSubjectsModal(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSubjects(false);
    }
  };

  const openGuardianModal = () => {
    setSelectedGuardianId(student?.parent?.id || '');
    setNewGuardianForm({
      name: '',
      email: '',
      phone: '',
      relationship: student?.guardianRelationship || 'father',
    });
    fetchGuardians();
    setShowGuardianModal(true);
  };

  const openClassArmModal = () => {
    setSelectedClassId(student?.classId || '');
    setSelectedArmId(student?.armId || '');
    if (student?.classId) fetchArms(student.classId);
    setShowClassArmModal(true);
  };

  const openSubjectsModal = () => {
    fetchSubjectsData();
    setShowSubjectsModal(true);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Student not found</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  const classNameDisplay = getClassName();
  const armDisplay = getArmLetter();

  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px), linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className={`mb-6 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'}`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back
        </motion.button>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'}`}>
            {student.name}
          </h1>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Admission No: {student.admissionNumber || 'Not set'} | Class: {classNameDisplay} {armDisplay !== 'Not assigned' ? `| ${armDisplay}` : ''}
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Personal Information */}
          <FadeInSection>
            <SectionCard title="Personal Information" icon={UserIcon} theme={theme} onEdit={openPersonalModal}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Full Name" value={student.name} theme={theme} />
                <InfoItem label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not specified'} theme={theme} />
                <InfoItem label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not set'} theme={theme} />
                <InfoItem label="Admission Number" value={student.admissionNumber || 'Not set'} theme={theme} />
                <InfoItem label="Address" value={student.address || 'Not set'} theme={theme} />
              </div>
            </SectionCard>
          </FadeInSection>

          {/* Guardian */}
          <FadeInSection>
            <SectionCard title="Guardian" icon={UserGroupIcon} theme={theme} onEdit={openGuardianModal}>
              {student.parent ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem label="Name" value={student.parent.name} theme={theme} />
                  <InfoItem label="Relationship" value={student.guardianRelationship ? student.guardianRelationship.charAt(0).toUpperCase() + student.guardianRelationship.slice(1) : 'Not specified'} theme={theme} />
                  <InfoItem label="Phone" value={student.parent.phone || 'Not provided'} theme={theme} />
                  <InfoItem label="Email" value={student.parent.email} theme={theme} />
                </div>
              ) : (
                <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No guardian assigned. Click "Edit" to assign a guardian.</p>
              )}
            </SectionCard>
          </FadeInSection>

          {/* Academic Information */}
          <FadeInSection>
            <SectionCard title="Academic Information" icon={AcademicCapIcon} theme={theme} onEdit={openClassArmModal}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Class" value={classNameDisplay} theme={theme} />
                <InfoItem label="Arm" value={armDisplay} theme={theme} />
              </div>
            </SectionCard>
          </FadeInSection>

          {/* Subject Offerings */}
          <FadeInSection>
            <SectionCard title="Subject Offerings" icon={AcademicCapIcon} theme={theme} onEdit={openSubjectsModal}>
              {studentSubjects.length === 0 ? (
                <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No subjects assigned. Click "Edit" to add subjects.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {studentSubjects.map(sub => (
                    <span
                      key={sub.id}
                      className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white"
                    >
                      {sub.name}
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>
          </FadeInSection>

          {/* School Fees */}
          <FadeInSection>
            <SectionCard title="School Fees" icon={CurrencyDollarIcon} theme={theme}>
              {feeLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : feeRecords.length === 0 ? (
                <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No fee records available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Term</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Amount (₦)</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Paid (₦)</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Due Date</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeRecords.map(fee => (
                        <tr key={fee.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{fee.term}</td>
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{fee.amount.toLocaleString()}</td>
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{fee.paid.toLocaleString()}</td>
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{new Date(fee.dueDate).toLocaleDateString()}</td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              fee.status === 'paid'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : fee.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {fee.status === 'paid' ? <CheckCircleIcon className="h-3 w-3" /> : fee.status === 'partial' ? <CheckCircleIcon className="h-3 w-3" /> : <XCircleIcon className="h-3 w-3" />}
                              {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                </table>
                </div>
              )}
            </SectionCard>
          </FadeInSection>

          {/* Attendance Summary */}
          <FadeInSection>
            <SectionCard title="Attendance Summary" icon={CalendarIcon} theme={theme}>
              {attendanceLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : attendanceSummary ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div onClick={() => fetchAttendanceDetails('present')} className="cursor-pointer transition-transform hover:scale-105">
                      <StatCard label="Present" value={attendanceSummary.present} color="green" theme={theme} />
                    </div>
                    <div onClick={() => fetchAttendanceDetails('absent')} className="cursor-pointer transition-transform hover:scale-105">
                      <StatCard label="Absent" value={attendanceSummary.absent} color="red" theme={theme} />
                    </div>
                    <StatCard label="Total Days" value={attendanceSummary.total} color="blue" theme={theme} />
                    <StatCard label="Attendance %" value={`${attendanceSummary.percentage}%`} color="purple" theme={theme} />
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${attendanceSummary.percentage}%` }} />
                  </div>
                  <p className={`text-sm text-center mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {attendanceSummary.percentage}% attendance rate
                  </p>
                </>
              ) : (
                <p className="text-center py-4 text-gray-500">No attendance records found.</p>
              )}
            </SectionCard>
          </FadeInSection>

          {/* Academic Performance */}
          <FadeInSection>
            <SectionCard title="Academic Performance" icon={ChartBarIcon} theme={theme}>
              {resultsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : resultsData.length === 0 ? (
                <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No results available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Term</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Subject</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Score</th>
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultsData.map((result, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{result.term}</td>
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{result.subject}</td>
                          <td className="py-2 px-2 text-gray-900 dark:text-gray-200">{result.score}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              result.grade === 'A'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : result.grade === 'B+' || result.grade === 'B'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {result.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                </table>
                </div>
              )}
            </SectionCard>
          </FadeInSection>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Personal Info Modal */}
      <AnimatePresence>
        {showPersonalModal && (
          <Modal onClose={() => setShowPersonalModal(false)} title="Edit Personal Information" theme={theme}>
            <div className="space-y-4">
              <InputField label="Full Name" value={personalForm.name} onChange={(v: string) => setPersonalForm({...personalForm, name: v})} theme={theme} required />
              <SelectField label="Gender" value={personalForm.gender} options={['male', 'female']} onChange={(v: string) => setPersonalForm({...personalForm, gender: v})} theme={theme} />
              <InputField label="Date of Birth" type="date" value={personalForm.dateOfBirth} onChange={(v: string) => setPersonalForm({...personalForm, dateOfBirth: v})} theme={theme} />
              <InputField label="Address" value={personalForm.address} onChange={(v: string) => setPersonalForm({...personalForm, address: v})} theme={theme} />
              <InputField label="Admission Number" value={personalForm.admissionNumber} onChange={(v: string) => setPersonalForm({...personalForm, admissionNumber: v})} theme={theme} />
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowPersonalModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <button onClick={updatePersonalInfo} disabled={personalSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {personalSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Guardian Modal */}
      <AnimatePresence>
        {showGuardianModal && (
          <Modal onClose={() => setShowGuardianModal(false)} title="Assign Guardian" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select Existing Guardian</label>
                <select
                  value={selectedGuardianId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGuardianId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  disabled={guardianLoading}
                >
                  <option value="">-- Choose a guardian --</option>
                  {guardians.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.email})</option>
                  ))}
                </select>
              </div>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600"></div></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-gray-900 px-2 text-gray-500">OR</span></div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Create New Guardian</label>
                <input type="text" placeholder="Full name" value={newGuardianForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGuardianForm({...newGuardianForm, name: e.target.value})} className={`w-full mb-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                <input type="email" placeholder="Email" value={newGuardianForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGuardianForm({...newGuardianForm, email: e.target.value})} className={`w-full mb-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                <input type="text" placeholder="Phone (optional)" value={newGuardianForm.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGuardianForm({...newGuardianForm, phone: e.target.value})} className={`w-full mb-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Relationship *</label>
                <select
                  value={newGuardianForm.relationship}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewGuardianForm({...newGuardianForm, relationship: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowGuardianModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <button onClick={reassignGuardian} disabled={guardianSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {guardianSubmitting ? 'Saving...' : 'Assign Guardian'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Class/Arm Modal */}
      <AnimatePresence>
        {showClassArmModal && (
          <Modal onClose={() => setShowClassArmModal(false)} title="Change Class & Arm" theme={theme}>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSelectedClassId(e.target.value);
                    setSelectedArmId('');
                    if (e.target.value) fetchArms(e.target.value);
                  }}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Arm</label>
                <select
                  value={selectedArmId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedArmId(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  disabled={!selectedClassId}
                >
                  <option value="">-- Select Arm --</option>
                  {arms.map(a => (
                    <option key={a.id} value={a.id}>Arm {a.letter}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowClassArmModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <button onClick={updateClassArm} disabled={classArmLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {classArmLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Subject Offerings Modal */}
      <AnimatePresence>
        {showSubjectsModal && (
          <Modal onClose={() => setShowSubjectsModal(false)} title="Manage Subject Offerings" theme={theme} size="lg">
            <div className="space-y-4">
              {subjectsLoading ? (
                <div className="text-center py-8">Loading subjects...</div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {allSubjects.map(subject => {
                    const isChecked = selectedSubjectIds.has(subject.id);
                    return (
                      <label key={subject.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newSet = new Set(selectedSubjectIds);
                            if (e.target.checked) newSet.add(subject.id);
                            else newSet.delete(subject.id);
                            setSelectedSubjectIds(newSet);
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{subject.name}</p>
                          {subject.description && <p className="text-sm text-gray-500">{subject.description}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setShowSubjectsModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <button onClick={saveSubjectOfferings} disabled={savingSubjects} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {savingSubjects ? 'Saving...' : 'Save Subjects'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Attendance Detail Modal */}
      <AnimatePresence>
        {showAttendanceDetailModal && (
          <Modal onClose={() => setShowAttendanceDetailModal(false)} title={attendanceDetailTitle} theme={theme} size="lg">
            <div className="max-h-96 overflow-y-auto">
              {attendanceDetailList.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No records found.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceDetailList.map((record, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-50'}`}>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== Helper Components ====================
const FadeInSection = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);

const SectionCard = ({ title, icon: Icon, children, theme, onEdit }: any) => (
  <div className={`p-6 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white border border-gray-200'}`}>
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
        <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
        >
          <PencilIcon className="h-4 w-4 mr-1" /> Edit
        </button>
      )}
    </div>
    {children}
  </div>
);

// Fixed InfoItem to accept undefined values and display a fallback
const InfoItem = ({ label, value, theme }: { label: string; value?: string; theme: string }) => (
  <div>
    <dt className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</dt>
    <dd className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value || '—'}</dd>
  </div>
);

const StatCard = ({ label, value, color, theme }: { label: string; value: string | number; color: string; theme: string }) => {
  const colorMap: Record<string, { light: string; dark: string }> = {
    green: { light: 'text-green-700', dark: 'text-green-400' },
    red: { light: 'text-red-700', dark: 'text-red-400' },
    blue: { light: 'text-blue-700', dark: 'text-blue-400' },
    purple: { light: 'text-purple-700', dark: 'text-purple-400' },
  };
  return (
    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white/80'} text-center shadow-sm`}>
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color][theme === 'dark' ? 'dark' : 'light']}`}>{value}</p>
    </div>
  );
};

const Modal = ({ children, onClose, title, theme, size = 'md' }: any) => {
  const maxWidth = size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </div>
    </>
  );
};

const InputField = ({ label, type = 'text', value, onChange, theme, required = false, placeholder = '' }: any) => (
  <div>
    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
      {label} {required && '*'}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
    />
  </div>
);

const SelectField = ({ label, value, options, onChange, theme }: any) => (
  <div>
    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
      ))}
    </select>
  </div>
);