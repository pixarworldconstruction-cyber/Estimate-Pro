/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toDate } from '../lib/utils';

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
        // Use dueDate instead of date
        const reminderDate = toDate(data.dueDate);
        
        // If reminder is within the next 10 minutes and hasn't been notified
        const diffInMinutes = (reminderDate.getTime() - now.getTime()) / (1000 * 60);
        
        if (diffInMinutes > -5 && diffInMinutes < 10 && !notifiedReminders.has(doc.id)) {
          const message = `Reminder: ${data.title}`;
          const description = data.description || 'You have an upcoming task.';

          if (Notification.permission === 'granted') {
            try {
              new Notification(message, {
                body: description,
                icon: '/favicon.ico'
              });
            } catch (e) {
              console.error('Browser notification failed:', e);
            }
          }
          
          // Always show toast as fallback/additional alert
          import('sonner').then(({ toast }) => {
            toast.info(message, {
              description: description,
              duration: 10000,
            });
          });

          notifiedReminders.add(doc.id);
        }
      });
    });

    return () => unsubscribe();
  }, [user, company, notifiedReminders]);

  return null;
}
