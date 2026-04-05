import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  User,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ChevronRight,
  FileText,
  MessageSquare,
  HardHat,
  MapPin,
  ClipboardList,
  History,
  Camera,
  ImageIcon,
  X,
  Loader2,
  Trash2,
  Phone,
  MessageCircle,
  Zap,
  Globe
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Project, DailyReport, Staff, Client } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function ProjectManagement() {
  const { company, staff, isAdmin, isSuperAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'details'>('list');

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    clientId: '',
    status: 'active',
    assignedStaffIds: [],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    location: ''
  });

  const [reportData, setReportData] = useState<Partial<DailyReport>>({
    todayWork: '',
    workCompleted: '',
    workProcess: '',
    notes: '',
    photos: [],
    laborCount: 0,
    laborDetails: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [isUploading, setIsUploading] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState<{ isOpen: boolean, phone: string }>({ isOpen: false, phone: '' });

  const cleanPhone = (phone: string) => phone ? phone.replace(/\D/g, '') : '';
  const getWhatsAppUrl = (phone: string, isBusiness: boolean = false) => {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return '#';
    const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    return isBusiness 
      ? `whatsapp-business://send?phone=${formatted}`
      : `https://wa.me/${formatted}`;
  };

  useEffect(() => {
    if (!staff) return;

    const projectsQuery = isSuperAdmin
      ? query(collection(db, 'projects'))
      : query(collection(db, 'projects'), where('companyId', '==', staff.companyId));

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      // Filter projects based on staff assignment if not admin/superadmin
      if (!isAdmin && !isSuperAdmin && staff) {
        setProjects(projectsData.filter(p => p.assignedStaffIds.includes(staff.id)));
      } else {
        setProjects(projectsData);
      }
    });

    // Fetch staff
    const staffQuery = isSuperAdmin
      ? query(collection(db, 'staff'))
      : query(collection(db, 'staff'), where('companyId', '==', staff.companyId));
    
    getDocs(staffQuery).then(snapshot => {
      setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Staff[]);
    });

    // Fetch clients
    const clientsQuery = isSuperAdmin
      ? query(collection(db, 'clients'))
      : query(collection(db, 'clients'), where('companyId', '==', staff.companyId));
    
    getDocs(clientsQuery).then(snapshot => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
    });

    return () => unsubscribe();
  }, [staff, isSuperAdmin, isAdmin]);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'dailyReports'),
      where('projectId', '==', selectedProject.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyReport[]);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    try {
      await addDoc(collection(db, 'projects'), {
        ...formData,
        companyId: company.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        clientId: '',
        status: 'active',
        assignedStaffIds: [],
        startDate: format(new Date(), 'yyyy-MM-dd'),
        location: ''
      });
      toast.success('Project created successfully');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!isAdmin && !isSuperAdmin) return;
    
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated daily reports.')) {
      return;
    }

    try {
      // Delete project document
      await deleteDoc(doc(db, 'projects', projectId));

      // Delete associated daily reports
      const reportsQuery = query(collection(db, 'dailyReports'), where('projectId', '==', projectId));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      if (!reportsSnapshot.empty) {
        const batch = writeBatch(db);
        reportsSnapshot.docs.forEach((reportDoc) => {
          batch.delete(reportDoc.ref);
        });
        await batch.commit();
      }

      toast.success('Project and associated reports deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const compressImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !company) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const compressedFile = await compressImage(file);
        const storageRef = ref(storage, `projects/${selectedProject?.id}/reports/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, compressedFile);
        return getDownloadURL(storageRef);
      });

      const urls = await Promise.all(uploadPromises);
      setReportData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...urls]
      }));
      toast.success('Photos uploaded successfully');
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (urlToRemove: string) => {
    setReportData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter(url => url !== urlToRemove)
    }));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !staff) return;

    try {
      await addDoc(collection(db, 'dailyReports'), {
        ...reportData,
        projectId: selectedProject.id,
        staffId: staff.id,
        staffName: staff.name,
        createdAt: serverTimestamp()
      });
      setIsReportModalOpen(false);
      setReportData({
        todayWork: '',
        workCompleted: '',
        workProcess: '',
        notes: '',
        photos: [],
        laborCount: 0,
        laborDetails: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      toast.success('Daily report submitted');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'on-hold': return 'bg-amber-100 text-amber-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (activeView === 'details' && selectedProject) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveView('list')}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{selectedProject.name}</h1>
              <p className="text-zinc-500 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {selectedProject.location}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              <Plus className="w-5 h-5" />
              Daily Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Project Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-zinc-100">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Status</div>
                <div className={cn("inline-flex px-2 py-1 rounded-lg text-xs font-bold uppercase", getStatusColor(selectedProject.status))}>
                  {selectedProject.status}
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-zinc-100">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Start Date</div>
                <div className="text-zinc-900 font-bold">{selectedProject.startDate}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-zinc-100">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Reports</div>
                <div className="text-zinc-900 font-bold">{reports.length}</div>
              </div>
            </div>

            {/* Daily Reports Timeline */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Daily Site Reports
                </h2>
              </div>
              <div className="divide-y divide-zinc-100">
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <div key={report.id} className="p-6 space-y-4 hover:bg-zinc-50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-zinc-600">
                            {report.staffName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{report.staffName}</div>
                            <div className="text-xs text-zinc-500">{format(new Date(report.date), 'MMMM d, yyyy')}</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today's Work</div>
                          <p className="text-sm text-zinc-600">{report.todayWork}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Work Completed</div>
                          <p className="text-sm text-zinc-600">{report.workCompleted}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Work Process</div>
                          <p className="text-sm text-zinc-600">{report.workProcess}</p>
                        </div>
                      </div>

                      {(report.laborCount || report.laborDetails) && (
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-start gap-4">
                          <div className="p-2 bg-white rounded-xl border border-zinc-100">
                            <HardHat className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 mb-1">Labor Details</div>
                            <div className="text-xs text-zinc-600">
                              <span className="font-bold text-primary">{report.laborCount || 0}</span> Labors on site
                              {report.laborDetails && <span className="mx-2 text-zinc-300">|</span>}
                              {report.laborDetails}
                            </div>
                          </div>
                        </div>
                      )}

                      {report.photos && report.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {report.photos.map((photo, i) => (
                            <img 
                              key={i} 
                              src={photo} 
                              alt="Site" 
                              className="w-24 h-24 rounded-xl object-cover border border-zinc-100 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      )}
                      {report.notes && (
                        <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-500 italic">
                          "{report.notes}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-zinc-500">
                    No daily reports submitted yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Assigned Staff */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Assigned Staff
              </h3>
              <div className="space-y-3">
                {selectedProject.assignedStaffIds.map(staffId => {
                  const s = staffList.find(st => st.id === staffId);
                  return s ? (
                    <div key={staffId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-50 transition-all">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                        {s.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">{s.name}</div>
                        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{s.position}</div>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Client Details
              </h3>
              {(() => {
                const client = clients.find(c => c.id === selectedProject.clientId);
                return client ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="font-bold text-zinc-900">{client.name}</div>
                      <div className="text-sm text-zinc-500">{client.phone}</div>
                      <div className="text-sm text-zinc-500">{client.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`tel:${cleanPhone(client.phone)}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                      <button 
                        onClick={() => setWhatsappModal({ isOpen: true, phone: client.phone })}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-all"
                      >
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                ) : <div className="text-sm text-zinc-500">No client linked</div>;
              })()}
            </div>
          </div>
        </div>

        {/* WhatsApp Choice Modal */}
        {whatsappModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-[40px] max-w-md w-full space-y-6 shadow-2xl border border-zinc-100">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <MessageCircle className="w-10 h-10" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Choose WhatsApp</h3>
                <p className="text-zinc-500 text-sm font-medium">
                  Which version of WhatsApp would you like to use?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <a 
                  href={getWhatsAppUrl(whatsappModal.phone, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWhatsappModal({ isOpen: false, phone: '' })}
                  className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                >
                  <MessageCircle className="w-5 h-5" />
                  Standard WhatsApp
                </a>
                <a 
                  href={getWhatsAppUrl(whatsappModal.phone, true)}
                  onClick={() => setWhatsappModal({ isOpen: false, phone: '' })}
                  className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Zap className="w-5 h-5" />
                  WhatsApp Business
                </a>
                <button 
                  onClick={() => setWhatsappModal({ isOpen: false, phone: '' })}
                  className="px-6 py-4 rounded-2xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daily Report Modal */}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h2 className="text-xl font-bold text-zinc-900">New Daily Report</h2>
                <button onClick={() => setIsReportModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-all">
                  <Plus className="w-6 h-6 rotate-45 text-zinc-500" />
                </button>
              </div>
              <form onSubmit={handleSubmitReport} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Report Date</label>
                  <input
                    type="date"
                    value={reportData.date}
                    onChange={e => setReportData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Labor Count</label>
                    <input
                      type="number"
                      value={reportData.laborCount}
                      onChange={e => setReportData(prev => ({ ...prev, laborCount: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Labor Details</label>
                    <input
                      type="text"
                      value={reportData.laborDetails}
                      onChange={e => setReportData(prev => ({ ...prev, laborDetails: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                      placeholder="e.g. 2 Carpenters, 1 Helper"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Today's Work</label>
                  <textarea
                    value={reportData.todayWork}
                    onChange={e => setReportData(prev => ({ ...prev, todayWork: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary min-h-[80px]"
                    placeholder="What was done today?"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Work Completed</label>
                  <textarea
                    value={reportData.workCompleted}
                    onChange={e => setReportData(prev => ({ ...prev, workCompleted: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary min-h-[80px]"
                    placeholder="What tasks were finished?"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Work in Process</label>
                  <textarea
                    value={reportData.workProcess}
                    onChange={e => setReportData(prev => ({ ...prev, workProcess: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary min-h-[80px]"
                    placeholder="What is currently ongoing?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Site Photos</label>
                  <div className="grid grid-cols-4 gap-2">
                    {reportData.photos?.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-100">
                        <img src={url} alt="Site" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-500 mt-1">Add Photos</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Additional Notes (Optional)</label>
                  <input
                    type="text"
                    value={reportData.notes}
                    onChange={e => setReportData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  Submit Report
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Projects</h1>
          <p className="text-zinc-500">Manage site projects and daily reporting</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search projects by name or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-primary bg-white transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div 
            key={project.id} 
            onClick={() => {
              setSelectedProject(project);
              setActiveView('details');
            }}
            className="bg-white rounded-3xl border border-zinc-100 p-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getStatusColor(project.status))}>
                {project.status}
              </div>
              {(isAdmin || isSuperAdmin) && (
                <button 
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
            <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{project.description}</p>
            
            <div className="space-y-3 pt-4 border-t border-zinc-50">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <MapPin className="w-4 h-4 text-zinc-400" />
                {project.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Calendar className="w-4 h-4 text-zinc-400" />
                Started {project.startDate}
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex -space-x-2">
                  {project.assignedStaffIds.slice(0, 3).map((staffId, i) => (
                    <div key={staffId} className="w-8 h-8 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-zinc-600">
                      {staffList.find(s => s.id === staffId)?.name[0] || '?'}
                    </div>
                  ))}
                  {project.assignedStaffIds.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-zinc-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      +{project.assignedStaffIds.length - 3}
                    </div>
                  )}
                </div>
                <div className="text-xs font-bold text-primary flex items-center gap-1">
                  View Details <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <h2 className="text-xl font-bold text-zinc-900">Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-all">
                <Plus className="w-6 h-6 rotate-45 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Client</label>
                  <select
                    value={formData.clientId}
                    onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Assign Staff</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {staffList.map(s => (
                    <label key={s.id} className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                      formData.assignedStaffIds?.includes(s.id) 
                        ? "bg-primary/5 border-primary text-primary" 
                        : "bg-white border-zinc-100 text-zinc-600 hover:border-primary"
                    )}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.assignedStaffIds?.includes(s.id)}
                        onChange={e => {
                          const ids = formData.assignedStaffIds || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, assignedStaffIds: [...ids, s.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, assignedStaffIds: ids.filter(id => id !== s.id) }));
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{s.name}</span>
                        <span className="text-[10px] opacity-70">{s.position}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
