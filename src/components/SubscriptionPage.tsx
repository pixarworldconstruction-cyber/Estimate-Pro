import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { PricingPackage, Company, PaymentSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Check, Zap, ShieldCheck, CreditCard, Smartphone } from 'lucide-react';
import { cn, toDate } from '../lib/utils';
import { toast } from 'sonner';

export default function SubscriptionPage({ initialView, setActiveTab }: { initialView?: 'plans' | 'addons', setActiveTab?: (tab: string) => void }) {
  const { company, isSuperAdmin } = useAuth();
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [paymentStep, setPaymentStep] = useState<'plans' | 'payment' | 'details' | 'success'>('plans');

  useEffect(() => {
    const unsubPackages = onSnapshot(collection(db, 'packages'), (snapshot) => {
      const allPackages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPackage));
      
      let filtered = allPackages;
      if (initialView === 'addons') {
        filtered = allPackages.filter(pkg => pkg.type === 'addon');
      } else {
        filtered = allPackages.filter(pkg => pkg.type === 'subscription');
      }
      
      filtered.sort((a, b) => a.price - b.price);
      setPackages(filtered);
      setLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        setPaymentSettings(doc.data() as PaymentSettings);
      }
    });

    // Clear welcome flag if it's true
    if (company?.showWelcome) {
      updateDoc(doc(db, 'companies', company.id), { showWelcome: false });
    }

    return () => {
      unsubPackages();
      unsubSettings();
    };
  }, [company?.showWelcome, company?.id]);

  const handleSubscribe = async (pkg: PricingPackage) => {
    if (!company) return;

    if (!paymentSettings?.razorpayKeyId) {
      toast.error('Payment system is not configured. Please contact support.');
      return;
    }

    const options = {
      key: paymentSettings.razorpayKeyId,
      amount: pkg.price * 100, // Razorpay expects amount in paise
      currency: 'INR',
      name: 'Construction Pro',
      description: `Subscription for ${pkg.name}`,
      handler: async function (response: any) {
        setLoading(true);
        try {
          const expiryDate = new Date();
          if (pkg.period === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else if (pkg.period === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else if (pkg.period === 'one-time') {
            expiryDate.setTime(toDate(company.expiryDate).getTime());
          }

          const updates: any = {
            planName: pkg.type === 'subscription' ? pkg.name : company.planName,
            estimateLimit: (company.estimateLimit || 0) + (pkg.estimateLimit || 0),
            staffLimit: Math.max(company.staffLimit || 0, pkg.staffLimit || 0),
            paymentMethod: 'razorpay',
            paymentReference: response.razorpay_payment_id,
            updatedAt: Timestamp.now()
          };

          if (pkg.type === 'subscription') {
            updates.status = 'active';
            updates.subscriptionStatus = 'active';
            updates.expiryDate = Timestamp.fromDate(expiryDate);
            updates.currentPeriodEnd = Timestamp.fromDate(expiryDate);
          }

          await updateDoc(doc(db, 'companies', company.id), updates);
          setPaymentStep('success');
          setSelectedPackage(pkg);
          toast.success('Payment successful!');
        } catch (err: any) {
          toast.error('Failed to update subscription: ' + err.message);
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: company.adminName || '',
        email: company.adminEmail || '',
        contact: company.phone || ''
      },
      theme: {
        color: '#f43f5e' // primary color
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  if (paymentStep === 'success') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8 p-8 bg-white rounded-3xl border border-zinc-100 shadow-xl">
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-zinc-900">Payment Successful!</h2>
          <p className="text-zinc-500">Your account has been updated successfully. You can now continue using all features.</p>
        </div>
        <div className="p-4 bg-zinc-50 rounded-2xl text-left">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Transaction Details</p>
          <div className="flex justify-between items-center">
            <span className="font-medium text-zinc-600">{selectedPackage?.name}</span>
            <span className="font-black text-zinc-900">₹{selectedPackage?.price}</span>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <div className="text-center space-y-4 relative">
        {company?.showWelcome && (
          <button 
            onClick={() => setActiveTab ? setActiveTab('dashboard') : window.location.href = '/'}
            className="absolute top-0 right-0 px-6 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
          >
            Skip for Now
          </button>
        )}
        <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
          {paymentStep === 'plans' 
            ? (initialView === 'addons' ? 'Available Addons' : 'Choose Your Plan') 
            : 'Complete Payment'}
        </h1>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
          {paymentStep === 'plans' 
            ? (initialView === 'addons' 
                ? 'Enhance your plan with extra estimates and features.' 
                : 'Select a package that fits your business needs. All plans include core features.')
            : `You are subscribing to the ${selectedPackage?.name}. Select your payment method.`}
        </p>
      </div>

      {paymentStep === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={cn(
                "bg-white p-8 rounded-3xl border-2 transition-all relative flex flex-col",
                pkg.popular ? "border-primary shadow-2xl shadow-primary/10 scale-105 z-10" : "border-zinc-100 hover:border-zinc-200"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold text-zinc-900 mb-2">{pkg.name}</h3>
                <div className="flex items-baseline gap-2">
                  {pkg.originalPrice && (
                    <span className="text-lg text-zinc-400 line-through">₹{pkg.originalPrice}</span>
                  )}
                  <span className="text-4xl font-black text-primary">₹{pkg.price}</span>
                  <span className="text-zinc-500 font-medium">/{pkg.period === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center gap-3 text-zinc-700 font-medium">
                  <Check className="text-green-500 w-5 h-5 shrink-0" />
                  <span>{pkg.estimateLimit} Estimates</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-700 font-medium">
                  <Check className="text-green-500 w-5 h-5 shrink-0" />
                  <span>{pkg.staffLimit} Staff Members</span>
                </div>
                {pkg.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-zinc-600">
                    <Check className="text-green-500 w-5 h-5 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(pkg)}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all shadow-lg",
                  pkg.popular 
                    ? "bg-primary text-white shadow-primary/20 hover:bg-primary/90" 
                    : "bg-zinc-900 text-white shadow-zinc-900/20 hover:bg-zinc-800"
                )}
              >
                {initialView === 'addons' ? 'Buy Now' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Addons Section */}
      {paymentStep === 'plans' && initialView !== 'addons' && packages.some(p => p.type === 'addon') && (
        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Zap className="text-amber-500" />
            Need More Estimates?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.filter(p => p.type === 'addon').map((pkg) => (
              <div key={pkg.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all">
                <h3 className="font-bold text-zinc-900 mb-1">{pkg.name}</h3>
                <p className="text-2xl font-black text-primary mb-4">₹{pkg.price}</p>
                <div className="text-sm text-zinc-500 mb-6">
                  + {pkg.estimateLimit} Extra Estimates
                </div>
                <button
                  onClick={() => handleSubscribe(pkg)}
                  className="w-full py-2 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
