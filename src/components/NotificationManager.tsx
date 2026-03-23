/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationManager() {
  const { user, company } = useAuth();
  const [notifiedReminders] = useState(new Set<string>());

  useEffect(() => {
    if (!user || !company || !('Notification' in window)) return;

    // Request permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Query for upcoming reminders
    const remindersRef = collection(db, 'reminders');
    const q = query(
      remindersRef,
      where('companyId', '==', company.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const reminderDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        
        // If reminder is within the next 10 minutes and hasn't been notified
        const diffInMinutes = (reminderDate.getTime() - now.getTime()) / (1000 * 60);
        
        if (diffInMinutes > -5 && diffInMinutes < 10 && !notifiedReminders.has(doc.id)) {
          if (Notification.permission === 'granted') {
            new Notification('Reminder: ' + data.title, {
              body: data.description || 'You have an upcoming task.',
              icon: '/favicon.ico'
            });
            notifiedReminders.add(doc.id);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, company, notifiedReminders]);

  return null;
}
