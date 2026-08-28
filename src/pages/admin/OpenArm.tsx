import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  EyeIcon,
  XMarkIcon,
  UserPlusIcon,
  UserGroupIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

// --- Types ---
interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Student {
  id: string;
  name: string;
  gender?: string;
  admissionNumber?: string;
  parent?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

interface Subject {
  armSubjectId: string;
  id: string;
  name: string;
  teacher?: Teacher;
}

interface Skill {
  id: string;
  name: string;
  description: string;
}

interface TimetableEntry {
  id: string;
  armId: string;
  dayOfWeek: string;
  timeSlot: string;
  subjectId: string | null;
  subject?: { id: string; name: string };
}

interface TimetablePeriod {
  day: string;
  periods: string[];
}

interface ArmData {
  id: string;
  letter: string;
  alias?: string;
  teacher?: Teacher;
  students: Student[];
  subjects: { subject: Subject }[];
}

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
}

interface ArmSubjectResponse {
  id: string;
  subject: Subject;
  teacher?: Teacher;
}

export default function OpenArm() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { classId, armId } = useParams<{ classId: string; armId: string }>();
  const navigate = useNavigate();

  const [armData, setArmData] = useState<ArmData | null>(null);
  const [className, setClassName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [timetable, setTimetable] = useState<TimetablePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('members');

  // Modal states
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentOption, setAddStudentOption] = useState<'create' | 'fromSchool' | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredAllStudents, setFilteredAllStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    gender: 'male',
    admissionNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingStudent] = useState(false);

  const [showParentModal, setShowParentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [parentAssignmentStep, setParentAssignmentStep] = useState<'choose' | 'linkExisting' | 'registerNew'>('choose');
  const [allParents, setAllParents] = useState<{ id: string; name: string; email: string; phone?: string }[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [newParentForm, setNewParentForm] = useState({ name: '', phone: '', email: '' });
  const [parentsLoading, setParentsLoading] = useState(false);
  const [isLinkingParent, setIsLinkingParent] = useState(false);
  const [isCreatingParent, setIsCreatingParent] = useState(false);

  const [subjectStep, setSubjectStep] = useState<'choose' | 'linkExisting' | 'createNew'>('choose');
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [newSubjectForm, setNewSubjectForm] = useState({ name: '', description: '' });
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);

  const [skillStep, setSkillStep] = useState<'choose' | 'linkExisting' | 'createNew'>('choose');
  const [allSkills, setAllSkills] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [newSkillForm, setNewSkillForm] = useState({ name: '', description: '' });
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isEditingSkill, setIsEditingSkill] = useState(false);

  const [attendanceViewData, setAttendanceViewData] = useState<AttendanceRecord[]>([]);
  const [attendanceFilterStart, setAttendanceFilterStart] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceFilterEnd, setAttendanceFilterEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showTakeAttendanceModal, setShowTakeAttendanceModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ studentId: string; present: boolean }[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('');

  const [showFormTeacherModal, setShowFormTeacherModal] = useState(false);
  const [selectedFormTeacherId, setSelectedFormTeacherId] = useState<string>('');
  const [updatingFormTeacher, setUpdatingFormTeacher] = useState(false);

  // ---------- Fetch functions ----------
  const fetchClassName = async () => {
    if (!token || !classId) return;
    try {
      const res = await api.get(`/classes/${classId}`, token);
      if (res.ok) {
        const data = await res.json() as { name: string };
        setClassName(data.name);
      }
    } catch (err) {
      console.warn('Could not fetch class name', err);
    }
  };

  const fetchArmData = async () => {
    if (!token || !armId) return;
    try {
      const res = await api.get(`/arms/${armId}`, token);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as ArmData & { subjects: ArmSubjectResponse[] };
      setArmData(data);
      setStudents(data.students || []);
      const flatSubjects = (data.subjects || []).map((item: ArmSubjectResponse) => ({
        armSubjectId: item.id,
        id: item.subject.id,
        name: item.subject.name,
        teacher: item.teacher,
      }));
      setSubjects(flatSubjects);
    } catch (err: any) {
      console.error(err);
      throw new Error('Failed to load arm details');
    }
  };

  const fetchSkills = async () => {
    if (!token || !armId) return;
    try {
      const res = await api.get(`/skills/arm/${armId}`, token);
      if (res.ok) {
        const data = await res.json() as Skill[];
        setSkills(data);
      } else {
        console.warn('Skills endpoint not implemented yet');
      }
    } catch (err) {
      console.warn('Could not fetch skills', err);
    }
  };

  const fetchTimetable = async () => {
    if (!token || !armId) return;
    try {
      const res = await api.get(`/timetable/arm/${armId}`, token);
      if (res.ok) {
        const entries = await res.json() as TimetableEntry[];
        const grouped: Record<string, { timeSlot: string; subjectName: string }[]> = {};
        entries.forEach(entry => {
          if (!grouped[entry.dayOfWeek]) grouped[entry.dayOfWeek] = [];
          grouped[entry.dayOfWeek].push({
            timeSlot: entry.timeSlot,
            subjectName: entry.subject?.name || '—',
          });
        });
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const timetableData: TimetablePeriod[] = Object.entries(grouped)
          .map(([day, periods]) => ({
            day,
            periods: periods
              .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
              .map(p => `${p.timeSlot} ${p.subjectName}`),
          }))
          .sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));
        setTimetable(timetableData);
        if (timetableData.length > 0 && !selectedTimetableDay) {
          setSelectedTimetableDay(timetableData[0].day);
        }
      } else {
        setTimetable([]);
      }
    } catch (err) {
      console.warn('Could not fetch timetable', err);
      setTimetable([]);
    }
  };

  const fetchAllStudents = async (): Promise<Student[]> => {
    if (!token) return [];
    try {
      const res = await api.get('/students', token);
      if (res.ok) {
        return await res.json() as Student[];
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
    return [];
  };

  const fetchAllParents = async () => {
    if (!token) return;
    setParentsLoading(true);
    try {
      const res = await api.get('/parents', token);
      if (res.ok) {
        const data = await res.json() as { id: string; name: string; email: string; phone?: string }[];
        setAllParents(data);
      }
    } catch (err) {
      console.error('Failed to fetch parents', err);
    } finally {
      setParentsLoading(false);
    }
  };

  const fetchAllSubjects = async () => {
    if (!token) return;
    try {
      const res = await api.get('/subjects', token);
      if (res.ok) {
        const data = await res.json() as { id: string; name: string; description?: string }[];
        setAllSubjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const fetchAllTeachers = async () => {
    if (!token) return;
    try {
      const res = await api.get('/teachers', token);
      if (res.ok) {
        const data = await res.json() as Teacher[];
        setAllTeachers(data);
      }
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    }
  };

  const fetchAllSkills = async () => {
    if (!token) return;
    try {
      const res = await api.get('/skills', token);
      if (res.ok) {
        const data = await res.json() as { id: string; name: string; description?: string }[];
        setAllSkills(data);
      }
    } catch (err) {
      console.error('Failed to fetch skills', err);
    }
  };

  const fetchAttendanceRecords = async (startDate: string, endDate: string) => {
    if (!token || !armId) return;
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/attendance/arm/${armId}?startDate=${startDate}&endDate=${endDate}`, token);
      if (res.ok) {
        const data = await res.json() as AttendanceRecord[];
        setAttendanceViewData(data);
      } else {
        console.warn('Attendance fetch failed');
        setAttendanceViewData([]);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendanceViewData([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const prepareTakeAttendance = async () => {
    if (!armId) return;
    try {
      const res = await api.get(`/attendance/arm/${armId}?startDate=${attendanceDate}&endDate=${attendanceDate}`, token);
      let existingRecords: AttendanceRecord[] = [];
      if (res.ok) existingRecords = await res.json() as AttendanceRecord[];
      const records = students.map(student => {
        const existing = existingRecords.find(r => r.studentId === student.id);
        return {
          studentId: student.id,
          present: existing ? existing.present : true,
        };
      });
      setAttendanceRecords(records);
      setShowTakeAttendanceModal(true);
    } catch (err) {
      console.error(err);
      setAttendanceRecords(students.map(s => ({ studentId: s.id, present: true })));
      setShowTakeAttendanceModal(true);
    }
  };

  const saveAttendance = async () => {
    if (!armId) return;
    setSavingAttendance(true);
    try {
      const res = await api.post(`/attendance/arm/${armId}`, {
        date: attendanceDate,
        records: attendanceRecords,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Attendance saved successfully');
      setShowTakeAttendanceModal(false);
      fetchAttendanceRecords(attendanceFilterStart, attendanceFilterEnd);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'term') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    switch (preset) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(today);
        end.setDate(today.getDate() + (6 - today.getDay()));
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'term':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 2, 31);
        break;
    }
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setAttendanceFilterStart(startStr);
    setAttendanceFilterEnd(endStr);
    fetchAttendanceRecords(startStr, endStr);
  };

  const updateFormTeacher = async () => {
    if (!armId || !selectedFormTeacherId) return;
    setUpdatingFormTeacher(true);
    try {
      const res = await api.patch(`/arms/${armId}`, { teacherId: selectedFormTeacherId }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Form teacher updated');
      await fetchArmData();
      setShowFormTeacherModal(false);
      setSelectedFormTeacherId('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingFormTeacher(false);
    }
  };

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchClassName();
        await fetchArmData();
        await Promise.all([fetchSkills(), fetchTimetable(), fetchAllTeachers()]);
        const today = new Date().toISOString().split('T')[0];
        setAttendanceFilterStart(today);
        setAttendanceFilterEnd(today);
        await fetchAttendanceRecords(today, today);
      } catch (err: any) {
        setError(err.message);
        toast.error('Failed to load arm data');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [classId, armId, token]);

  // --- Handlers ---
  const handleOpenAddStudentModal = () => {
    setAddStudentOption(null);
    setSelectedStudents(new Set());
    setStudentSearchTerm('');
    setShowAddStudentModal(true);
  };

  const handleOptionSelect = (option: 'create' | 'fromSchool') => {
    setAddStudentOption(option);
    if (option === 'fromSchool') {
      fetchAllStudents().then(studentsData => {
        const currentStudentIds = new Set(students.map(s => s.id));
        const available = studentsData.filter((s: Student) => !currentStudentIds.has(s.id));
        setAllStudents(available);
        setFilteredAllStudents(available);
        setSelectedStudents(new Set());
        setStudentSearchTerm('');
      });
    }
  };

  // Filter students based on search term
  useEffect(() => {
    if (addStudentOption === 'fromSchool') {
      const search = studentSearchTerm.toLowerCase().trim();
      if (!search) {
        setFilteredAllStudents(allStudents);
      } else {
        const filtered = allStudents.filter(student =>
          student.name.toLowerCase().includes(search) ||
          (student.admissionNumber && student.admissionNumber.toLowerCase().includes(search))
        );
        setFilteredAllStudents(filtered);
      }
    }
  }, [studentSearchTerm, allStudents, addStudentOption]);

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Select all filtered students
  const selectAllFiltered = () => {
    const allIds = filteredAllStudents.map(s => s.id);
    const newSelected = new Set(selectedStudents);
    allIds.forEach(id => newSelected.add(id));
    setSelectedStudents(newSelected);
  };

  // Deselect all filtered students
  const deselectAllFiltered = () => {
    const allIds = filteredAllStudents.map(s => s.id);
    const newSelected = new Set(selectedStudents);
    allIds.forEach(id => newSelected.delete(id));
    setSelectedStudents(newSelected);
  };

  const handleCreateStudent = async () => {
    if (!newStudentForm.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const createRes = await api.post('/students', {
        name: newStudentForm.name,
        gender: newStudentForm.gender,
        admissionNumber: newStudentForm.admissionNumber || undefined,
      }, token);
      if (!createRes.ok) throw new Error(await createRes.text());
      const newStudent = await createRes.json() as Student;

      const assignRes = await api.patch(`/students/${newStudent.id}`, { armId }, token);
      if (!assignRes.ok) throw new Error(await assignRes.text());

      toast.success('Student created and added to arm');
      await fetchArmData();
      fetchAttendanceRecords(attendanceFilterStart, attendanceFilterEnd);
      setShowAddStudentModal(false);
      setAddStudentOption(null);
      setNewStudentForm({ name: '', gender: 'male', admissionNumber: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Multi-select handler for adding existing students
  const handleAddExistingStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }
    setIsSubmitting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const studentId of selectedStudents) {
        try {
          const res = await api.patch(`/students/${studentId}`, { armId }, token);
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} student(s) to this arm${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      } else {
        toast.error(`Failed to add students to this arm`);
      }

      await fetchArmData();
      fetchAttendanceRecords(attendanceFilterStart, attendanceFilterEnd);
      setShowAddStudentModal(false);
      setAddStudentOption(null);
      setSelectedStudents(new Set());
      setStudentSearchTerm('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubject = () => {
    setSubjectStep('choose');
    setSelectedSubjectId('');
    setNewSubjectForm({ name: '', description: '' });
    setSelectedTeacherId('');
    fetchAllSubjects();
    fetchAllTeachers();
    setEditingSubject(null);
    setShowSubjectModal(true);
  };

  const handleEditSubject = async (subject: Subject) => {
    setEditingSubject({ ...subject });
    await fetchAllTeachers();
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async () => {
    if (!editingSubject || !armId) return;
    setIsEditingSubject(true);
    try {
      if (subjects.some(s => s.id === editingSubject.id)) {
        const res = await api.patch(`/subjects/arm-subjects/${editingSubject.armSubjectId}`, {
          name: editingSubject.name,
          teacherId: editingSubject.teacher?.id,
        }, token);
        if (!res.ok) throw new Error(await res.text());
        toast.success('Subject updated');
      } else {
        const res = await api.post(`/arms/${armId}/subjects`, {
          subjectId: editingSubject.id,
          name: editingSubject.name,
          teacherId: editingSubject.teacher?.id,
        }, token);
        if (!res.ok) throw new Error(await res.text());
        toast.success('Subject added');
      }
      await fetchArmData();
      setShowSubjectModal(false);
      setEditingSubject(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsEditingSubject(false);
    }
  };

  const linkSubjectToArm = async (subjectId: string, teacherId?: string) => {
    let subject = allSubjects.find(s => s.id === subjectId);
    if (!subject) subject = { id: subjectId, name: 'Unknown', description: '' };
    const teacherObj = teacherId ? { id: teacherId, name: '', email: '' } : undefined;
    setEditingSubject({ id: subject.id, name: subject.name, teacher: teacherObj, armSubjectId: '' });
    try {
      const res = await api.post(`/arms/${armId}/subjects`, {
        subjectId: subject.id,
        name: subject.name,
        teacherId: teacherId,
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Subject added');
      await fetchArmData();
      setShowSubjectModal(false);
      setEditingSubject(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateAndLinkSubject = async () => {
    if (!newSubjectForm.name.trim()) {
      toast.error('Subject name is required');
      return;
    }
    setIsAddingSubject(true);
    try {
      const createRes = await api.post('/subjects', {
        name: newSubjectForm.name,
        description: newSubjectForm.description || undefined,
      }, token);
      if (!createRes.ok) throw new Error(await createRes.text());
      const newSubject = await createRes.json() as { id: string };
      await linkSubjectToArm(newSubject.id, selectedTeacherId || undefined);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleAddSkill = () => {
    setSkillStep('choose');
    setSelectedSkillId('');
    setNewSkillForm({ name: '', description: '' });
    fetchAllSkills();
    setEditingSkill(null);
    setShowSkillModal(true);
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setShowSkillModal(true);
  };

  const linkSkillToArm = async (skillId: string) => {
    try {
      const res = await api.post(`/arms/${armId}/skills`, { skillId }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Skill added');
      await fetchSkills();
      setShowSkillModal(false);
      setEditingSkill(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateAndLinkSkill = async () => {
    if (!newSkillForm.name.trim()) {
      toast.error('Skill name is required');
      return;
    }
    setIsAddingSkill(true);
    try {
      const createRes = await api.post('/skills', {
        name: newSkillForm.name,
        description: newSkillForm.description || undefined,
      }, token);
      if (!createRes.ok) throw new Error(await createRes.text());
      const newSkill = await createRes.json() as { id: string };
      await linkSkillToArm(newSkill.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleSaveSkill = async () => {
    if (!editingSkill || !armId) return;
    setIsEditingSkill(true);
    try {
      if (skills.some(s => s.id === editingSkill.id)) {
        const res = await api.patch(`/skills/${editingSkill.id}`, editingSkill, token);
        if (!res.ok) throw new Error(await res.text());
        toast.success('Skill updated');
      } else {
        const res = await api.post(`/arms/${armId}/skills`, editingSkill, token);
        if (!res.ok) throw new Error(await res.text());
        toast.success('Skill added');
      }
      await fetchSkills();
      setShowSkillModal(false);
      setEditingSkill(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsEditingSkill(false);
    }
  };

  const handleAssignParent = (student: Student) => {
    setSelectedStudent(student);
    setParentAssignmentStep('choose');
    setSelectedParentId('');
    setNewParentForm({ name: '', phone: '', email: '' });
    fetchAllParents();
    setShowParentModal(true);
  };

  const handleLinkExistingParent = async () => {
    if (!selectedStudent || !selectedParentId) {
      toast.error('Please select a parent');
      return;
    }
    setIsLinkingParent(true);
    try {
      const res = await api.patch(`/students/${selectedStudent.id}`, { parentId: selectedParentId }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Parent linked successfully');
      await fetchArmData();
      setShowParentModal(false);
      setSelectedStudent(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLinkingParent(false);
    }
  };

  const handleRegisterNewParent = async () => {
    if (!selectedStudent || !newParentForm.name.trim() || !newParentForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setIsCreatingParent(true);
    try {
      const assignRes = await api.patch(`/students/${selectedStudent.id}`, {
        newParent: {
          name: newParentForm.name,
          email: newParentForm.email,
          phone: newParentForm.phone || '',
        }
      }, token);
      if (!assignRes.ok) throw new Error(await assignRes.text());
      toast.success('Parent created and assigned');
      await fetchArmData();
      setShowParentModal(false);
      setSelectedStudent(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingParent(false);
    }
  };

  const totalStudents = students.length;
  const presentCount = 0;
  const absentCount = totalStudents - presentCount;
  const maleCount = students.filter(s => s.gender === 'male').length;
  const femaleCount = students.filter(s => s.gender === 'female').length;

  // --- Render Tab Content ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'members':
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleOpenAddStudentModal}
                disabled={isAddingStudent}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingStudent ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <PlusIcon className="h-4 w-4 mr-2" />
                )}
                Add Student
              </button>
            </div>
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`flex flex-wrap items-center justify-between p-3 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/15'
                      : 'bg-white border border-gray-200 shadow-sm hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.name}</span>
                    {student.gender && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          student.gender === 'male'
                            ? theme === 'dark'
                              ? 'bg-blue-900/30 text-blue-300'
                              : 'bg-blue-500 text-white'
                            : theme === 'dark'
                            ? 'bg-pink-900/30 text-pink-300'
                            : 'bg-pink-500 text-white'
                        }`}
                      >
                        {student.gender}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                    {student.parent ? (
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Parent: {student.parent.name}</span>
                    ) : (
                      <button
                        onClick={() => handleAssignParent(student)}
                        className={`p-1 rounded transition-colors ${
                          theme === 'dark'
                            ? 'text-yellow-400 hover:text-yellow-300 hover:bg-white/10'
                            : 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100'
                        }`}
                        title="Assign Parent"
                      >
                        <UserPlusIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/admin/student/${student.id}`)}
                      className={`p-1 rounded transition-colors ${
                        theme === 'dark'
                          ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10'
                          : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                      }`}
                      title="View Bio"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="text-center py-8 text-gray-500">No students in this arm yet. Click "Add Student" to get started.</div>
              )}
            </div>
          </div>
        );

      case 'subjects':
        return (
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{subject.name}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Teacher: {subject.teacher?.name || 'Not assigned'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditSubject(subject)}
                    className={`p-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10'
                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                    }`}
                    title="Edit Subject"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/admin/subject/${subject.id}`, { state: { armId } })}
                    className={`p-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-green-400 hover:text-green-300 hover:bg-white/10'
                        : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                    }`}
                    title="View Subject Page"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddSubject}
              disabled={isAddingSubject}
              className={`mt-4 w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 bg-gray-800/50'
                  : 'border border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-100 bg-white shadow-sm'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAddingSubject ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <PlusIcon className="h-4 w-4 mr-2" />
              )}
              Add Subject
            </button>
          </div>
        );

      case 'results':
        return <div className="text-center py-12 text-gray-500">Results for this arm will appear here.</div>;

      case 'skills':
        return (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{skill.name}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{skill.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditSkill(skill)}
                    className={`p-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10'
                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                    }`}
                    title="Edit Skill"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/admin/skill/${skill.id}`)}
                    className={`p-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-green-400 hover:text-green-300 hover:bg-white/10'
                        : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                    }`}
                    title="View Skill Page"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddSkill}
              disabled={isAddingSkill}
              className={`mt-4 w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 bg-gray-800/50'
                  : 'border border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-100 bg-white shadow-sm'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAddingSkill ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <PlusIcon className="h-4 w-4 mr-2" />
              )}
              Add Skill
            </button>
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Attendance Overview</h3>
              <button
                onClick={prepareTakeAttendance}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Take Attendance
              </button>
            </div>

            <div
              className={`flex flex-wrap gap-3 items-end p-4 rounded-xl ${
                theme === 'dark' ? 'bg-white/5' : 'bg-white border border-gray-200 shadow-sm'
              } backdrop-blur-sm`}
            >
              <div className="flex-1 min-w-[150px]">
                <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>From</label>
                <input
                  type="date"
                  value={attendanceFilterStart}
                  onChange={(e) => {
                    setAttendanceFilterStart(e.target.value);
                    fetchAttendanceRecords(e.target.value, attendanceFilterEnd);
                  }}
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>To</label>
                <input
                  type="date"
                  value={attendanceFilterEnd}
                  onChange={(e) => {
                    setAttendanceFilterEnd(e.target.value);
                    fetchAttendanceRecords(attendanceFilterStart, e.target.value);
                  }}
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => applyDatePreset('today')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => applyDatePreset('week')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => applyDatePreset('month')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => applyDatePreset('term')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  This Term
                </button>
              </div>
            </div>

            {loadingAttendance ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attendanceViewData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No attendance records found for the selected period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                    <tr>
                      <th className={`text-left py-2 px-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Student</th>
                      {Array.from(new Set(attendanceViewData.map(r => r.date)))
                        .sort()
                        .map((date) => (
                          <th key={date} className={`text-center py-2 px-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} min-w-[80px]`}>
                            {new Date(date).toLocaleDateString()}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const studentRecords = attendanceViewData.filter((r) => r.studentId === student.id);
                      const dateMap = new Map(studentRecords.map((r) => [r.date, r.present]));
                      const uniqueDates = Array.from(new Set(attendanceViewData.map((r) => r.date))).sort();
                      return (
                        <tr key={student.id} className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                          <td className={`py-2 px-2 font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.name}</td>
                          {uniqueDates.map((date) => {
                            const isPresent = dateMap.get(date);
                            return (
                              <td key={date} className="text-center py-2 px-2">
                                {isPresent === undefined ? (
                                  <span className="text-gray-400">—</span>
                                ) : isPresent ? (
                                  <span className="inline-block w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs leading-6 font-bold">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-block w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs leading-6 font-bold">
                                    ✗
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'timetable':
        return (
          <div className="space-y-6">
            {timetable.length > 0 && (
              <div className={`flex flex-wrap gap-2 border-b pb-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                {timetable.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => setSelectedTimetableDay(day.day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTimetableDay === day.day
                        ? 'bg-blue-600 text-white shadow-md'
                        : theme === 'dark'
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {day.day}
                  </button>
                ))}
              </div>
            )}

            {selectedTimetableDay && (
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedTimetableDay}</h3>
                {(() => {
                  const selectedDayData = timetable.find((d) => d.day === selectedTimetableDay);
                  if (!selectedDayData || selectedDayData.periods.length === 0) {
                    return <p className="text-gray-500">No periods scheduled for this day.</p>;
                  }
                  return (
                    <div className="flex flex-wrap gap-2">
                      {selectedDayData.periods.map((period, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                            theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {period}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              onClick={() => navigate('/admin/timetable', { state: { classId, armId } })}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Full Timetable
            </button>
          </div>
        );

      case 'form-teacher':
        return (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Form Teacher Information</h3>
              <button
                onClick={() => {
                  setSelectedFormTeacherId(armData?.teacher?.id || '');
                  setShowFormTeacherModal(true);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300 hover:bg-white/10'
                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                }`}
                title="Edit Form Teacher"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </div>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name: {armData?.teacher?.name || 'Not assigned'}</p>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email: {armData?.teacher?.email || '—'}</p>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Phone: {armData?.teacher?.phone || '—'}</p>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Office Hours: Mon-Fri 9am-3pm</p>
          </div>
        );

      default:
        return null;
    }
  };

  // --- Loading & Error ---
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Loading arm details...</p>
      </div>
    );
  }

  if (error || !armData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{error || 'Arm not found'}</p>
          <button onClick={() => navigate('/admin/classes')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back to Classes</button>
        </div>
      </div>
    );
  }

  // Clean title without duplication
  const displayTitle = `${className} ${armData.letter}${armData.alias ? ` — ${armData.alias}` : ''}`;

  // --- Main render ---
  return (
    <div className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      {theme === 'dark' && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)`, backgroundSize: '60px 60px' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/admin/classes')}
          className={`mb-6 inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white hover:bg-white/10'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Classes
        </motion.button>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1
            className={`text-3xl font-bold ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent'
            }`}
          >
            {displayTitle}
          </h1>
          <p className={`mt-2 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Teacher: {armData.teacher?.name || 'Not assigned'}</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalStudents}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Present (Today)</p>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Absent (Today)</p>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md ${theme === 'dark' ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Male / Female</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{maleCount} / {femaleCount}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px space-x-8 overflow-x-auto">
            {['members', 'subjects', 'results', 'skills', 'attendance', 'timetable', 'form-teacher'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab === 'members' ? 'Class Members' : tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`p-6 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-white/5 backdrop-blur-xl border border-white/10' : 'bg-white shadow-md'}`}
        >
          {renderTabContent()}
        </motion.div>
      </div>

      {/* ====== All Modals ====== */}

      {/* Add Student Modal - UPDATED with multi-select and search */}
      <AnimatePresence>
        {showAddStudentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddStudentModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Add Student</h3>
                  <button onClick={() => setShowAddStudentModal(false)} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {addStudentOption === null ? (
                  <div className="p-6 space-y-4">
                    <button
                      onClick={() => handleOptionSelect('create')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-blue-500 bg-gray-800/50' : 'border-gray-200 hover:border-blue-400 bg-white/50'} group`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <UserPlusIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Student</p>
                          <p className="text-sm text-gray-500">Add a brand new student to the school</p>
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleOptionSelect('fromSchool')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-blue-500 bg-gray-800/50' : 'border-gray-200 hover:border-blue-400 bg-white/50'} group`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-left">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Add from School</p>
                          <p className="text-sm text-gray-500">Select existing students not yet in this arm</p>
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-green-500" />
                    </button>
                  </div>
                ) : (
                  <div className="p-6">
                    <button onClick={() => setAddStudentOption(null)} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                      ← Back
                    </button>
                    {addStudentOption === 'create' && (
                      <div className="mb-6">
                        <button
                          onClick={() => navigate('/admin/students')}
                          className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                        >
                          <UserGroupIcon className="h-4 w-4 mr-2" />
                          Bulk Registration
                        </button>
                      </div>
                    )}
                    {addStudentOption === 'create' && (
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Full Name *</label>
                          <input
                            type="text"
                            value={newStudentForm.name}
                            onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                            className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                            placeholder="e.g., John Doe"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input type="radio" value="male" checked={newStudentForm.gender === 'male'} onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value })} />
                              <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>Male</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input type="radio" value="female" checked={newStudentForm.gender === 'female'} onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value })} />
                              <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>Female</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Admission Number (optional)</label>
                          <input
                            type="text"
                            value={newStudentForm.admissionNumber}
                            onChange={e => setNewStudentForm({ ...newStudentForm, admissionNumber: e.target.value })}
                            className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                            placeholder="e.g., ADM2024001"
                          />
                        </div>
                        <button
                          onClick={handleCreateStudent}
                          disabled={isSubmitting || !newStudentForm.name.trim()}
                          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? 'Creating...' : 'Create & Add to Arm'}
                        </button>
                      </div>
                    )}
                    {addStudentOption === 'fromSchool' && (
                      <div>
                        {/* Search Input */}
                        <div className="relative mb-4">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            placeholder="Search students by name or admission number..."
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                          />
                        </div>

                        {/* Select/Deselect All buttons */}
                        {filteredAllStudents.length > 0 && (
                          <div className="flex gap-2 mb-4">
                            <button
                              onClick={selectAllFiltered}
                              className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              Select All ({filteredAllStudents.length})
                            </button>
                            <button
                              onClick={deselectAllFiltered}
                              className="px-3 py-1 text-xs rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                            >
                              Deselect All
                            </button>
                          </div>
                        )}

                        {/* Student List */}
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {filteredAllStudents.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                              {studentSearchTerm ? 'No students match your search.' : 'No students available to add.'}
                            </p>
                          ) : (
                            filteredAllStudents.map(student => {
                              const isSelected = selectedStudents.has(student.id);
                              return (
                                <div
                                  key={student.id}
                                  onClick={() => toggleStudentSelection(student.id)}
                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? theme === 'dark'
                                        ? 'bg-blue-900/30 border border-blue-500'
                                        : 'bg-blue-100 border border-blue-500'
                                      : theme === 'dark'
                                      ? 'hover:bg-white/10'
                                      : 'hover:bg-gray-100'
                                  }`}
                                >
                                  <div>
                                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{student.name}</p>
                                    {student.admissionNumber && <p className="text-xs text-gray-500">Admission: {student.admissionNumber}</p>}
                                  </div>
                                  {isSelected && (
                                    <CheckIcon className="h-5 w-5 text-blue-500" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => setShowAddStudentModal(false)}
                            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddExistingStudents}
                            disabled={isSubmitting || selectedStudents.size === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <UserPlusIcon className="h-4 w-4" />
                                Add {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Subject Modal */}
      <AnimatePresence>
        {showSubjectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSubjectModal(false);
                setEditingSubject(null);
                setSubjectStep('choose');
              }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {editingSubject ? 'Edit Subject' : (subjectStep === 'choose' ? 'Add Subject' : (subjectStep === 'linkExisting' ? 'Link Existing Subject' : 'Create New Subject'))}
                  </h3>
                  <button
                    onClick={() => {
                      setShowSubjectModal(false);
                      setEditingSubject(null);
                      setSubjectStep('choose');
                    }}
                    className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {editingSubject ? (
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                        <input
                          type="text"
                          value={editingSubject.name}
                          onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Assign Teacher (optional)</label>
                        <select
                          value={editingSubject.teacher?.id || ''}
                          onChange={e => setEditingSubject({
                            ...editingSubject,
                            teacher: e.target.value ? { id: e.target.value, name: '', email: '' } : undefined
                          })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          <option value="">None</option>
                          {allTeachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.email})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowSubjectModal(false);
                          setEditingSubject(null);
                        }}
                        className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                      <button onClick={handleSaveSubject} disabled={isEditingSubject} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isEditingSubject ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {subjectStep === 'choose' && (
                      <div className="space-y-4">
                        <button
                          onClick={() => setSubjectStep('linkExisting')}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-blue-500 bg-gray-800/50' : 'border-gray-200 hover:border-blue-400 bg-white/50'} group`}
                        >
                          <div className="flex items-center space-x-3">
                            <BookOpenIcon className="h-6 w-6 text-blue-500" />
                            <div className="text-left">
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Link Existing Subject</p>
                              <p className="text-sm text-gray-500">Choose a subject already in the system</p>
                            </div>
                          </div>
                          <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                        </button>
                        <button
                          onClick={() => setSubjectStep('createNew')}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-green-500 bg-gray-800/50' : 'border-gray-200 hover:border-green-400 bg-white/50'} group`}
                        >
                          <div className="flex items-center space-x-3">
                            <PlusIcon className="h-6 w-6 text-green-500" />
                            <div className="text-left">
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Subject</p>
                              <p className="text-sm text-gray-500">Add a brand new subject to the school</p>
                            </div>
                          </div>
                          <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-green-500" />
                        </button>
                      </div>
                    )}
                    {subjectStep === 'linkExisting' && (
                      <div>
                        <button onClick={() => setSubjectStep('choose')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                          ← Back
                        </button>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {allSubjects.map(subject => (
                            <div
                              key={subject.id}
                              onClick={() => setSelectedSubjectId(subject.id)}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedSubjectId === subject.id
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                                  : theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                              }`}
                            >
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{subject.name}</p>
                              {subject.description && <p className="text-sm text-gray-500">{subject.description}</p>}
                            </div>
                          ))}
                        </div>
                        {allTeachers.length > 0 && (
                          <div className="mt-4">
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Assign Teacher (optional)</label>
                            <select
                              value={selectedTeacherId}
                              onChange={e => setSelectedTeacherId(e.target.value)}
                              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                              <option value="">None</option>
                              {allTeachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setShowSubjectModal(false);
                              setSubjectStep('choose');
                            }}
                            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!selectedSubjectId) {
                                toast.error('Please select a subject');
                                return;
                              }
                              await linkSubjectToArm(selectedSubjectId, selectedTeacherId || undefined);
                            }}
                            disabled={!selectedSubjectId}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add to Arm
                          </button>
                        </div>
                      </div>
                    )}
                    {subjectStep === 'createNew' && (
                      <div>
                        <button onClick={() => setSubjectStep('choose')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                          ← Back
                        </button>
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject Name *</label>
                            <input
                              type="text"
                              value={newSubjectForm.name}
                              onChange={e => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                              placeholder="e.g., Mathematics"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description (optional)</label>
                            <textarea
                              rows={2}
                              value={newSubjectForm.description}
                              onChange={e => setNewSubjectForm({ ...newSubjectForm, description: e.target.value })}
                              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                          </div>
                          {allTeachers.length > 0 && (
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Assign Teacher (optional)</label>
                              <select
                                value={selectedTeacherId}
                                onChange={e => setSelectedTeacherId(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                              >
                                <option value="">None</option>
                                {allTeachers.map(teacher => (
                                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setShowSubjectModal(false);
                              setSubjectStep('choose');
                            }}
                            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateAndLinkSubject}
                            disabled={isAddingSubject}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAddingSubject ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              'Create & Add to Arm'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Skill Modal */}
      <AnimatePresence>
        {showSkillModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSkillModal(false);
                setEditingSkill(null);
                setSkillStep('choose');
              }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {editingSkill ? 'Edit Skill' : (skillStep === 'choose' ? 'Add Skill' : (skillStep === 'linkExisting' ? 'Link Existing Skill' : 'Create New Skill'))}
                  </h3>
                  <button
                    onClick={() => {
                      setShowSkillModal(false);
                      setEditingSkill(null);
                      setSkillStep('choose');
                    }}
                    className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {editingSkill ? (
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                        <input
                          type="text"
                          value={editingSkill.name}
                          onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                        <textarea
                          rows={3}
                          value={editingSkill.description}
                          onChange={e => setEditingSkill({ ...editingSkill, description: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowSkillModal(false);
                          setEditingSkill(null);
                        }}
                        className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                      <button onClick={handleSaveSkill} disabled={isEditingSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isEditingSkill ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {skillStep === 'choose' && (
                      <div className="space-y-4">
                        <button
                          onClick={() => setSkillStep('linkExisting')}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-blue-500 bg-gray-800/50' : 'border-gray-200 hover:border-blue-400 bg-white/50'} group`}
                        >
                          <div className="flex items-center space-x-3">
                            <BookOpenIcon className="h-6 w-6 text-blue-500" />
                            <div className="text-left">
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Link Existing Skill</p>
                              <p className="text-sm text-gray-500">Choose a skill already in the system</p>
                            </div>
                          </div>
                          <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                        </button>
                        <button
                          onClick={() => setSkillStep('createNew')}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-green-500 bg-gray-800/50' : 'border-gray-200 hover:border-green-400 bg-white/50'} group`}
                        >
                          <div className="flex items-center space-x-3">
                            <PlusIcon className="h-6 w-6 text-green-500" />
                            <div className="text-left">
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Skill</p>
                              <p className="text-sm text-gray-500">Add a brand new skill to the school</p>
                            </div>
                          </div>
                          <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-green-500" />
                        </button>
                      </div>
                    )}
                    {skillStep === 'linkExisting' && (
                      <div>
                        <button onClick={() => setSkillStep('choose')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                          ← Back
                        </button>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {allSkills.map(skill => (
                            <div
                              key={skill.id}
                              onClick={() => setSelectedSkillId(skill.id)}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedSkillId === skill.id
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                                  : theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                              }`}
                            >
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{skill.name}</p>
                              {skill.description && <p className="text-sm text-gray-500">{skill.description}</p>}
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setShowSkillModal(false);
                              setSkillStep('choose');
                            }}
                            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!selectedSkillId) {
                                toast.error('Please select a skill');
                                return;
                              }
                              await linkSkillToArm(selectedSkillId);
                            }}
                            disabled={!selectedSkillId}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add to Arm
                          </button>
                        </div>
                      </div>
                    )}
                    {skillStep === 'createNew' && (
                      <div>
                        <button onClick={() => setSkillStep('choose')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                          ← Back
                        </button>
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Skill Name *</label>
                            <input
                              type="text"
                              value={newSkillForm.name}
                              onChange={e => setNewSkillForm({ ...newSkillForm, name: e.target.value })}
                              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                              placeholder="e.g., Critical Thinking"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description (optional)</label>
                            <textarea
                              rows={2}
                              value={newSkillForm.description}
                              onChange={e => setNewSkillForm({ ...newSkillForm, description: e.target.value })}
                              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                          </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setShowSkillModal(false);
                              setSkillStep('choose');
                            }}
                            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateAndLinkSkill}
                            disabled={!newSkillForm.name.trim() || isAddingSkill}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAddingSkill ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              'Create & Add to Arm'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Parent Modal */}
      <AnimatePresence>
        {showParentModal && selectedStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowParentModal(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Assign Parent to {selectedStudent.name}</h3>
                  <button onClick={() => setShowParentModal(false)} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {parentAssignmentStep === 'choose' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setParentAssignmentStep('linkExisting')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-blue-500 bg-gray-800/50' : 'border-gray-200 hover:border-blue-400 bg-white/50'} group`}
                    >
                      <div className="flex items-center space-x-3">
                        <UserGroupIcon className="h-6 w-6 text-blue-500" />
                        <div className="text-left">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Link Existing Parent</p>
                          <p className="text-sm text-gray-500">Choose a parent already in the system</p>
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                    </button>
                    <button
                      onClick={() => setParentAssignmentStep('registerNew')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-gray-700 hover:border-green-500 bg-gray-800/50' : 'border-gray-200 hover:border-green-400 bg-white/50'} group`}
                    >
                      <div className="flex items-center space-x-3">
                        <UserPlusIcon className="h-6 w-6 text-green-500" />
                        <div className="text-left">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Register New Parent</p>
                          <p className="text-sm text-gray-500">Create a new parent record</p>
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-gray-400 group-hover:text-green-500" />
                    </button>
                  </div>
                )}
                {parentAssignmentStep === 'linkExisting' && (
                  <div>
                    <button onClick={() => setParentAssignmentStep('choose')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                      ← Back
                    </button>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {parentsLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : allParents.length === 0 ? (
                        <p className="text-center text-gray-500">No parents found in the system.</p>
                      ) : (
                        allParents.map(parent => (
                          <div
                            key={parent.id}
                            onClick={() => setSelectedParentId(parent.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedParentId === parent.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                                : theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                          >
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{parent.name}</p>
                            <p className="text-sm text-gray-500">{parent.email}</p>
                            {parent.phone && <p className="text-xs text-gray-400">{parent.phone}</p>}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button onClick={() => setShowParentModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
                      <button
                        onClick={handleLinkExistingParent}
                        disabled={!selectedParentId || isLinkingParent}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLinkingParent ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          'Assign'
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {parentAssignmentStep === 'registerNew' && (
                  <div>
                    <button onClick={() => setParentAssignmentStep('choose')} className="mb-4 text-sm text-blue-600 hover:underline flex items-center">
                      ← Back
                    </button>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Parent Name *</label>
                        <input
                          type="text"
                          value={newParentForm.name}
                          onChange={e => setNewParentForm({ ...newParentForm, name: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="e.g., John Doe"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                        <input
                          type="text"
                          value={newParentForm.phone}
                          onChange={e => setNewParentForm({ ...newParentForm, phone: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="+1234567890"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email *</label>
                        <input
                          type="email"
                          value={newParentForm.email}
                          onChange={e => setNewParentForm({ ...newParentForm, email: e.target.value })}
                          className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="parent@example.com"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button onClick={() => setShowParentModal(false)} className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
                      <button
                        onClick={handleRegisterNewParent}
                        disabled={!newParentForm.name.trim() || !newParentForm.email.trim() || isCreatingParent}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingParent ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          'Create & Assign'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Take Attendance Modal */}
      <AnimatePresence>
        {showTakeAttendanceModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTakeAttendanceModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Take Attendance - {new Date(attendanceDate).toLocaleDateString()}
                  </h3>
                  <button onClick={() => setShowTakeAttendanceModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => {
                        setAttendanceDate(e.target.value);
                        (async () => {
                          try {
                            const res = await api.get(`/attendance/arm/${armId}?startDate=${e.target.value}&endDate=${e.target.value}`, token);
                            let existing: AttendanceRecord[] = [];
                            if (res.ok) existing = await res.json() as AttendanceRecord[];
                            const records = students.map(student => {
                              const existingRecord = existing.find(r => r.studentId === student.id);
                              return {
                                studentId: student.id,
                                present: existingRecord ? existingRecord.present : true,
                              };
                            });
                            setAttendanceRecords(records);
                          } catch (err) {
                            console.error(err);
                          }
                        })();
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    {students.map(student => {
                      const record = attendanceRecords.find(r => r.studentId === student.id);
                      return (
                        <div key={student.id} className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-50'}`}>
                          <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{student.name}</span>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setAttendanceRecords(prev =>
                                prev.map(r => r.studentId === student.id ? { ...r, present: true } : r)
                              )}
                              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                record?.present
                                  ? 'bg-green-600 text-white shadow-md'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => setAttendanceRecords(prev =>
                                prev.map(r => r.studentId === student.id ? { ...r, present: false } : r)
                              )}
                              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                record?.present === false
                                  ? 'bg-red-600 text-white shadow-md'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={() => setShowTakeAttendanceModal(false)}
                    className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAttendance}
                    disabled={savingAttendance}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {savingAttendance ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Form Teacher Edit Modal */}
      <AnimatePresence>
        {showFormTeacherModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormTeacherModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Assign Form Teacher</h3>
                  <button onClick={() => setShowFormTeacherModal(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <div
                      onClick={() => setSelectedFormTeacherId('')}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFormTeacherId === ''
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                          : theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      }`}
                    >
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>None (Unassigned)</p>
                      <p className="text-sm text-gray-500">No form teacher assigned</p>
                    </div>
                    {allTeachers.map(teacher => (
                      <div
                        key={teacher.id}
                        onClick={() => setSelectedFormTeacherId(teacher.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedFormTeacherId === teacher.id
                            ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                            : theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}
                      >
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                        {teacher.phone && <p className="text-xs text-gray-400">{teacher.phone}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`flex justify-end gap-3 p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={() => setShowFormTeacherModal(false)}
                    className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateFormTeacher}
                    disabled={updatingFormTeacher}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {updatingFormTeacher ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}