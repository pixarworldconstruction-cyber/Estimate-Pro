import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { Plus, Search, Trash2, Edit2, Bell, CheckCircle, Clock, Phone, MessageCircle, Calendar, User } from 'lucide-react';
import { Reminder, Client } from '../types';
import ConfirmModal from './ConfirmModal';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';

export default function Reminders() {
  const { staff } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [formData, setFormData] = useState<Partial<Reminder>>({
    clientId: '',
    title: '',
    status: 'pending',
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotificationPermission(Notification.permission);
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Check for due reminders every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (reminder.status === 'pending') {
          const dueDate = new Date(reminder.dueDate);
          // If due in the last minute
          if (dueDate <= now && dueDate > new Date(now.getTime() - 60000)) {
            triggerNotification(reminder);
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [reminders]);

  const triggerNotification = (reminder: Reminder) => {
    if (notificationPermission === 'granted') {
      const client = clients.find(c => c.id === reminder.clientId);
      new Notification('Reminder Due!', {
        body: `${reminder.title} for ${client?.name || 'Client'}`,
        icon: '/favicon.ico'
      });
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error('Error playing sound:', e));
      }
    }
  };

  useEffect(() => {
    if (!staff) return;
    
    const qReminders = query(
      collection(db, 'reminders'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
      const sortedReminders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reminder))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setReminders(sortedReminders);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reminders'));

    const qClients = query(
      collection(db, 'clients'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const sortedClients = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(sortedClients);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    return () => {
      unsubReminders();
      unsubClients();
    };
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId) return;

    const dataToSave = {
      ...formData,
      companyId: staff.companyId,
      createdAt: selectedReminder ? (selectedReminder.createdAt || serverTimestamp()) : serverTimestamp(),
      createdBy: selectedReminder ? (selectedReminder.createdBy || staff.uid) : staff.uid,
      createdByName: selectedReminder ? (selectedReminder.createdByName || staff.name) : staff.name,
    };

    if (selectedReminder) {
      await updateDoc(doc(db, 'reminders', selectedReminder.id), dataToSave);
    } else {
      await addDoc(collection(db, 'reminders'), dataToSave);
    }
    setIsModalOpen(false);
    setSelectedReminder(null);
    setFormData({ clientId: '', title: '', status: 'pending', dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;
    await deleteDoc(doc(db, 'reminders', reminderToDelete));
    setReminderToDelete(null);
  };

  const toggleStatus = async (reminder: Reminder) => {
    const newStatus = reminder.status === 'done' ? 'pending' : 'done';
    await updateDoc(doc(db, 'reminders', reminder.id), { status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Reminders</h1>
          <div className="flex items-center gap-4 mt-2">
            {notificationPermission !== 'granted' ? (
              <button 
                onClick={requestPermission}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
              >
                <Bell className="w-3 h-3" />
                Enable Notifications
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Notifications Active
                </span>
                <button 
                  onClick={() => triggerNotification({ title: 'Test Notification', dueDate: new Date().toISOString() } as Reminder)}
                  className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  Test Style
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedReminder(null);
            setFormData({ clientId: '', title: '', status: 'pending', dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add New Reminder
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reminders.map(reminder => {
          const client = clients.find(c => c.id === reminder.clientId);
          const isOverdue = new Date(reminder.dueDate) < new Date() && reminder.status === 'pending';

          return (
            <div key={reminder.id} className={cn(
              "bg-white p-6 rounded-3xl shadow-sm border transition-all group",
              reminder.status === 'done' ? "opacity-60 grayscale" : "border-zinc-100 hover:shadow-md"
            )}>
              <div className="flex justify-between items-start mb-4">
                <button 
                  onClick={() => toggleStatus(reminder)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    reminder.status === 'done' ? "bg-green-500 text-white" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                  )}
                >
                  {reminder.status === 'done' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </button>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => {
                      setSelectedReminder(reminder);
                      setFormData(reminder);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-primary hover:bg-zinc-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setReminderToDelete(reminder.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className={cn("text-xl font-bold mb-1", reminder.status === 'done' ? "line-through text-zinc-400" : "text-zinc-900")}>
                {reminder.title}
              </h3>
              
              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                <User className="w-3 h-3" />
                {client?.name || 'Unknown Client'}
              </div>

              <div className="text-[10px] text-zinc-400 mb-4 flex items-center gap-1">
                <span>By {reminder.createdByName || 'System'}</span>
              </div>

              <div className={cn(
                "flex items-center gap-2 text-xs font-bold mb-6",
                isOverdue ? "text-red-500" : "text-zinc-400"
              )}>
                <Calendar className="w-4 h-4" />
                {format(new Date(reminder.dueDate), 'dd MMM yyyy, HH:mm')}
                {isOverdue && <span className="uppercase tracking-widest ml-auto">Overdue</span>}
              </div>

              {client && (
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={`tel:${client.mob1}`}
                    className="flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <a 
                    href={`https://wa.me/${client.mob1.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 bg-green-50 text-green-600 font-bold rounded-xl hover:bg-green-100 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6">
              {selectedReminder ? 'Edit Reminder' : 'Add New Reminder'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Client</label>
                <select
                  value={formData.clientId}
                  onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Reminder Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                  {selectedReminder ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-100 text-zinc-600 py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!reminderToDelete}
        onClose={() => setReminderToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Reminder?"
        message="Are you sure you want to delete this reminder?"
        confirmText="Delete"
      />
    </div>
  );
}
