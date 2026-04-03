import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, rtdb } from '../firebase';
import { ref, set, onDisconnect, onValue, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { doc, getDoc, onSnapshot, setDoc, query, where, getDocs, collection, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Staff, Company } from '../types';
import { toDate } from '../lib/utils';

const ALL_FEATURES = [
  'clients', 'estimates', 'items', 'reminders', 'insights', 
  'converter', 'calculator', 'sketch', 'construction-calc',
  'calc-brick', 'calc-plaster', 'calc-paint', 'calc-gypsum', 
  'calc-electrical', 'calc-flooring', 'calc-stone', 'calc-doors', 
  'calc-windows', 'calc-frame', 'calc-kitchen', 'calc-plumbing',
  'civil-drawing', 'invoices', 'projects'
];

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  company: Company | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, pass: string, name: string, companyId?: string, referredByCode?: string) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  cleanupExpiredAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setStaff(null);
        setCompany(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isSuperAdmin = staff?.role === 'super_admin' || user?.email === 'gujjupanchat0@gmail.com';
  const isAdmin = isSuperAdmin || staff?.role === 'admin';

  useEffect(() => {
    if (!user) return;

    const unsubStaff = onSnapshot(
      doc(db, 'staff', user.uid),
      async (docSnapshot) => {
        let currentStaff: Staff | null = null;
        
        if (docSnapshot.exists()) {
          currentStaff = { id: docSnapshot.id, ...docSnapshot.data() } as Staff;
        }

        // If no staff record exists OR it's a default record with no company
        if (!currentStaff || (!currentStaff.companyId && currentStaff.role === 'staff')) {
          if (user.email === 'gujjupanchat0@gmail.com') {
            const superAdmin: Staff = {
              id: user.uid,
              name: 'Super Admin',
              email: user.email!,
              role: 'super_admin',
              uid: user.uid,
              companyId: ''
            };
            try {
              await setDoc(doc(db, 'staff', user.uid), superAdmin);
              return; // onSnapshot will trigger again
            } catch (error) {
              console.error("Error creating super admin record:", error);
            }
          }

          // Self-healing for missing staff record if they are a company admin
          try {
            const companyQuery = query(
              collection(db, 'companies'),
              where('adminEmail', '==', user.email)
            );
            const companySnapshot = await getDocs(companyQuery);
            if (!companySnapshot.empty) {
              const companyDoc = companySnapshot.docs[0];
              const companyData = companyDoc.data();
              const recoveredStaff: Staff = {
                id: user.uid,
                uid: user.uid,
                name: companyData.adminName || user.displayName || 'Admin',
                email: user.email!,
                role: 'admin',
                companyId: companyDoc.id
              };
              console.log("Self-healing: Recovering staff record for admin:", user.email);
              await setDoc(doc(db, 'staff', user.uid), recoveredStaff);
              return; // onSnapshot will trigger again
            }
          } catch (error) {
            console.error("Error self-healing staff record:", error);
          }

          // Check for pending record by email
          try {
            const q = query(
              collection(db, 'staff'), 
              where('email', '==', user.email), 
              where('uid', '==', '')
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const pendingStaffDoc = querySnapshot.docs[0];
              const pendingData = pendingStaffDoc.data();
              
              const linkedStaff = {
                ...pendingData,
                uid: user.uid
              };
              
              await setDoc(doc(db, 'staff', user.uid), linkedStaff);
              await deleteDoc(pendingStaffDoc.ref);
              return; // onSnapshot will trigger again
            }
          } catch (error) {
            console.error("Error linking pending staff:", error);
          }
        }

        if (currentStaff) {
          setStaff(currentStaff);
          
          // Track online status in RTDB
          if (currentStaff.companyId) {
            const statusRef = ref(rtdb, `presence/${currentStaff.companyId}/${user.uid}`);
            set(statusRef, {
              name: currentStaff.name,
              role: currentStaff.role,
              lastActive: rtdbTimestamp(),
              online: true
            });
            onDisconnect(statusRef).set({
              name: currentStaff.name,
              role: currentStaff.role,
              lastActive: rtdbTimestamp(),
              online: false
            });
          }
        } else {
          setStaff(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error (staff):", error.message);
        setLoading(false);
      }
    );

    return () => unsubStaff();
  }, [user]);

  useEffect(() => {
    if (!staff?.companyId) {
      setCompany(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'companies', staff.companyId), 
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const companyData = { id: docSnapshot.id, ...docSnapshot.data() } as Company;
          
          // Ensure features exist
          if (!companyData.features || companyData.features.length === 0) {
            companyData.features = ALL_FEATURES;
            // Repair in DB if admin
            if (isAdmin) {
              try {
                await updateDoc(doc(db, 'companies', companyData.id), { features: ALL_FEATURES });
                console.log("Repaired company features for:", companyData.name);
              } catch (err) {
                console.error("Error repairing company features:", err);
              }
            }
          }

          // Check for expiry
          const now = new Date();
          const expiry = toDate(companyData.expiryDate);
          if (expiry < now && companyData.status === 'active') {
            try {
              await updateDoc(doc(db, 'companies', companyData.id), { status: 'expired' });
              companyData.status = 'expired';
            } catch (err) {
              console.error("Error auto-expiring company:", err);
            }
          } else if (expiry < now && companyData.status === 'trial') {
             try {
              await updateDoc(doc(db, 'companies', companyData.id), { status: 'expired' });
              companyData.status = 'expired';
            } catch (err) {
              console.error("Error auto-expiring trial:", err);
            }
          }

          setCompany(companyData);

          // Ensure old companies have a referral code
          if (!companyData.referralCode && isAdmin) {
            const newCode = generateReferralCode();
            try {
              await setDoc(doc(db, 'companies', companyData.id), { 
                referralCode: newCode,
                referralCount: 0
              }, { merge: true });
            } catch (error) {
              console.error("Error generating referral code for old company:", error);
            }
          }
        }
      },
      (error) => {
        console.error("Firestore Error (companies):", error.message);
      }
    );
    return () => unsubscribe();
  }, [staff?.companyId, staff?.role, isAdmin]);

  const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const signUp = async (email: string, pass: string, name: string, companyId: string = '', referredByCode: string = '') => {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Check if there's already a pending record for this email
    const q = query(
      collection(db, 'staff'), 
      where('email', '==', email), 
      where('uid', '==', '')
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const pendingStaffDoc = querySnapshot.docs[0];
      const pendingData = pendingStaffDoc.data();
      
      await setDoc(doc(db, 'staff', user.uid), {
        ...pendingData,
        uid: user.uid
      });
      await deleteDoc(pendingStaffDoc.ref);
    } else {
      let finalCompanyId = companyId;
      let role = 'staff';

      // If no companyId provided, create a new company (Trial)
      if (!companyId) {
        // Check if this email has already used a trial
        const trialQuery = query(
          collection(db, 'companies'), 
          where('adminEmail', '==', email)
        );
        const trialSnapshot = await getDocs(trialQuery);
        
        if (!trialSnapshot.empty) {
          throw new Error('This email has already been used for a trial or account. Please log in or use a different email.');
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14); // 14 days trial

        // Handle referral logic
        let referredByCompanyId = '';
        if (referredByCode) {
          const q = query(collection(db, 'companies'), where('referralCode', '==', referredByCode.toUpperCase()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const referringCompanyDoc = querySnapshot.docs[0];
            referredByCompanyId = referringCompanyDoc.id;
            
            // Increment referral count for the referring company
            const currentCount = referringCompanyDoc.data().referralCount || 0;
            await setDoc(referringCompanyDoc.ref, { 
              referralCount: currentCount + 1 
            }, { merge: true });
          }
        }

        const companyDoc = await addDoc(collection(db, 'companies'), {
          name: `${name}'s Company`,
          status: 'trial',
          planName: 'Trial Plan',
          expiryDate: expiryDate.toISOString(),
          features: ALL_FEATURES,
          staffLimit: 3,
          showWelcome: true,
          createdAt: serverTimestamp(),
          adminEmail: email,
          adminName: name,
          referralCode: generateReferralCode(),
          referredBy: referredByCode.toUpperCase(),
          referralCount: 0
        });
        finalCompanyId = companyDoc.id;
        role = 'admin';
      }

      // Create new staff record
      await setDoc(doc(db, 'staff', user.uid), {
        name,
        email,
        role,
        uid: user.uid,
        companyId: finalCompanyId
      });
    }
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const changePassword = async (newPass: string) => {
    if (user) {
      await updatePassword(user, newPass);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
    if (user) {
      console.log('User authenticated:', user.email, 'Admin status:', isAdmin, 'Super Admin:', isSuperAdmin);
    }
  }, [user, isAdmin, isSuperAdmin]);

  const cleanupExpiredAccounts = async () => {
    if (!isSuperAdmin) return;
    
    try {
      const now = new Date();
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      
      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data() as Company;
        if (!companyData.expiryDate) continue;
        
        const expiry = toDate(companyData.expiryDate);
        const diffDays = Math.floor((now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
        
        let shouldDelete = false;
        if (companyData.status === 'trial' && diffDays >= 8) {
          shouldDelete = true;
        } else if (companyData.status === 'expired' && diffDays >= 30) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          console.log(`Auto-deleting expired company: ${companyData.name} (${companyDoc.id})`);
          
          // 1. Delete all staff
          const staffQuery = query(collection(db, 'staff'), where('companyId', '==', companyDoc.id));
          const staffSnapshot = await getDocs(staffQuery);
          const staffDeletes = staffSnapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(staffDeletes);
          
          // 2. Delete company
          await deleteDoc(companyDoc.ref);
          
          // 3. Delete other related data (optional but good for "all data will loss")
          const collections = ['clients', 'estimates', 'items', 'reminders', 'crmHistory', 'projects', 'invoices'];
          for (const collName of collections) {
            const q = query(collection(db, collName), where('companyId', '==', companyDoc.id));
            const snap = await getDocs(q);
            const deletes = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletes);
          }
        }
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      cleanupExpiredAccounts();
    }
  }, [isSuperAdmin]);

  return (
    <AuthContext.Provider value={{ user, staff, company, loading, isAdmin, isSuperAdmin, signUp, signIn, logout, changePassword, resetPassword, cleanupExpiredAccounts }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
