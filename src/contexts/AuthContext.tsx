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
import { auth, db } from '../firebase';
import { doc, getDoc, onSnapshot, setDoc, query, where, getDocs, collection, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Staff, Company } from '../types';

const ALL_FEATURES = [
  'clients', 'estimates', 'items', 'reminders', 'insights', 
  'converter', 'calculator', 'sketch', 'construction-calc',
  'calc-brick', 'calc-plaster', 'calc-paint', 'calc-gypsum', 
  'calc-electrical', 'calc-flooring', 'calc-stone', 'calc-doors', 
  'calc-windows', 'calc-frame', 'calc-kitchen', 'calc-plumbing'
];

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  company: Company | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, pass: string, name: string, companyId?: string) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
      (doc) => {
        if (doc.exists()) {
          setCompany({ id: doc.id, ...doc.data() } as Company);
        }
      },
      (error) => {
        console.error("Firestore Error (companies):", error.message);
      }
    );
    return () => unsubscribe();
  }, [staff?.companyId]);

  const signUp = async (email: string, pass: string, name: string, companyId: string = '') => {
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
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 10); // 10 days trial

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
          adminName: name
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
        companyId: finalCompanyId,
        status: 'active',
        createdAt: new Date().toISOString()
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

  const isSuperAdmin = staff?.role === 'super_admin' || user?.email === 'gujjupanchat0@gmail.com';
  const isAdmin = isSuperAdmin || staff?.role === 'admin';

  useEffect(() => {
    if (user) {
      console.log('User authenticated:', user.email, 'Admin status:', isAdmin, 'Super Admin:', isSuperAdmin);
    }
  }, [user, isAdmin, isSuperAdmin]);

  return (
    <AuthContext.Provider value={{ user, staff, company, loading, isAdmin, isSuperAdmin, signUp, signIn, logout, changePassword, resetPassword }}>
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
