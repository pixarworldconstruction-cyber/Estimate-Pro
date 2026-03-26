import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, ShieldCheck, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { SupportContent } from '../types';
import { DEFAULT_SUPPORT_CONTENT } from '../constants/defaultContent';

export default function ContactUs() {
  const [supportContent, setSupportContent] = useState<SupportContent>(DEFAULT_SUPPORT_CONTENT);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'support'), (doc) => {
      if (doc.exists()) {
        setSupportContent(doc.data() as SupportContent);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-zinc-900 mb-2">Contact Us</h1>
        <p className="text-zinc-500">Need help? Get in touch with our super admin team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm space-y-6"
        >
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="text-primary w-7 h-7" />
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-900">Super Admin Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-zinc-600">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{supportContent.name}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-medium">{supportContent.email}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-medium">{supportContent.phone}</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-50">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Availability</div>
            <div className="text-sm font-bold text-zinc-900">{supportContent.availability}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 p-8 rounded-[32px] text-white space-y-6 relative overflow-hidden"
        >
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <MessageSquare className="text-primary w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Quick Support</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                For urgent technical issues or plan renewals, please call our direct support line or send an email with your company ID.
              </p>
            </div>
            <button 
              onClick={() => window.location.href = `mailto:${supportContent.email}`}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
            >
              Send Email Now
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        </motion.div>
      </div>

      <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100">
        <h4 className="text-amber-900 font-bold mb-2">Important Note</h4>
        <p className="text-amber-800 text-sm leading-relaxed">
          {supportContent.note || "Please mention your Company Name and Admin Email when contacting support for faster resolution of your queries."}
        </p>
      </div>
    </div>
  );
}
