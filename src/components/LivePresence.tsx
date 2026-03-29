import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, off } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { Users, Circle } from 'lucide-react';

interface PresenceData {
  name: string;
  role: string;
  online: boolean;
  lastActive: number;
}

export default function LivePresence() {
  const { staff } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceData>>({});

  useEffect(() => {
    if (!staff?.companyId) return;

    const presenceRef = ref(rtdb, `presence/${staff.companyId}`);
    onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        setOnlineUsers(snapshot.val());
      } else {
        setOnlineUsers({});
      }
    });

    return () => off(presenceRef);
  }, [staff?.companyId]);

  const activeUsers = Object.values(onlineUsers).filter(u => u.online);

  if (activeUsers.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Live Team Activity</h2>
        <span className="ml-auto px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full flex items-center gap-1">
          <Circle className="w-2 h-2 fill-current" />
          {activeUsers.length} Online
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {activeUsers.map((user, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100"
            title={`${user.name} (${user.role})`}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-zinc-700">{user.name}</span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase">{user.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
