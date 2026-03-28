import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { PricingPackage, Company, PaymentSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Check, Zap, ShieldCheck, CreditCard, Smartphone } from 'lucide-react';
import { cn, toDate } from '../lib/utils';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const { company, isSuperAdmin } = useAuth();
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [paymentStep, setPaymentStep] = useState<'plans' | 'payment' | 'details' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    upiId: ''
  });

  useEffect(() => {
    const unsubPackages = onSnapshot(collection(db, 'packages'), (snapshot) => {
      const allPackages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPackage));
      const filtered = allPackages
        .filter(pkg => pkg.type === 'subscription')
        .sort((a, b) => a.price - b.price);
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
    setSelectedPackage(pkg);
    setPaymentStep('payment');
  };

  const handleSelectMethod = (method: 'card' | 'upi') => {
    setPaymentMethod(method);
    setPaymentStep('details');
  };

  const processPayment = async () => {
    if (!company || !selectedPackage || !paymentMethod) return;
    
    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const expiryDate = new Date();
      if (selectedPackage.period === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (selectedPackage.period === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else if (selectedPackage.period === 'one-time') {
        // For addons, we just add to the limit, don't change expiry
        expiryDate.setTime(toDate(company.expiryDate).getTime());
      }

      const updates: any = {
        planName: selectedPackage.type === 'subscription' ? selectedPackage.name : company.planName,
        estimateLimit: (company.estimateLimit || 0) + (selectedPackage.estimateLimit || 0),
        staffLimit: Math.max(company.staffLimit || 0, selectedPackage.staffLimit || 0),
        paymentMethod: paymentMethod,
        updatedAt: Timestamp.now()
      };

      if (selectedPackage.type === 'subscription') {
        updates.status = 'active';
        updates.subscriptionStatus = 'active';
        updates.expiryDate = Timestamp.fromDate(expiryDate);
        updates.currentPeriodEnd = Timestamp.fromDate(expiryDate);
      }

      await updateDoc(doc(db, 'companies', company.id), updates);

      setPaymentStep('success');
      toast.success('Payment processed successfully!');
    } catch (err: any) {
      toast.error('Payment failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && paymentStep !== 'details') return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

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
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
          {paymentStep === 'plans' ? 'Choose Your Plan' : 'Complete Payment'}
        </h1>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
          {paymentStep === 'plans' 
            ? 'Select a package that fits your business needs. All plans include core features.' 
            : `You are subscribing to the ${selectedPackage?.name}. Select your payment method.`}
        </p>
      </div>

      {paymentStep === 'plans' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.filter(p => p.type === 'subscription').map((pkg) => (
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
                Get Started
              </button>
            </div>
          ))}
        </div>
      ) : paymentStep === 'payment' ? (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl space-y-6">
          <div className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 font-medium">Selected Plan</p>
              <p className="font-bold text-zinc-900">{selectedPackage?.name}</p>
            </div>
            <p className="text-xl font-black text-primary">₹{selectedPackage?.price}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSelectMethod('card')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10">
                  <CreditCard className="text-zinc-500 group-hover:text-primary" />
                </div>
                <span className="font-bold text-zinc-900">Credit / Debit Card</span>
              </div>
              <Check className="text-primary opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleSelectMethod('upi')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10">
                  <Smartphone className="text-zinc-500 group-hover:text-primary" />
                </div>
                <span className="font-bold text-zinc-900">UPI (GPay, PhonePe, etc.)</span>
              </div>
              <Check className="text-primary opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          <button
            onClick={() => setPaymentStep('plans')}
            className="w-full text-zinc-500 font-bold py-2 hover:text-zinc-900 transition-all"
          >
            Back to Plans
          </button>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl space-y-6 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-zinc-900">Processing Payment...</p>
              <p className="text-sm text-zinc-500">Please do not refresh the page</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-zinc-900">Enter Payment Details</h3>
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
              {paymentMethod === 'card' ? 'Card Payment' : 'UPI Payment'}
            </span>
          </div>

          {paymentMethod === 'card' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Card Number</label>
                <input 
                  type="text" 
                  placeholder="XXXX XXXX XXXX XXXX"
                  className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-primary transition-all"
                  value={paymentDetails.cardNumber}
                  onChange={e => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Expiry Date</label>
                  <input 
                    type="text" 
                    placeholder="MM/YY"
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-primary transition-all"
                    value={paymentDetails.expiry}
                    onChange={e => setPaymentDetails({...paymentDetails, expiry: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">CVV</label>
                  <input 
                    type="password" 
                    placeholder="***"
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-primary transition-all"
                    value={paymentDetails.cvv}
                    onChange={e => setPaymentDetails({...paymentDetails, cvv: e.target.value})}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {paymentSettings?.qrCodeUrl && (
                <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <img 
                    src={paymentSettings.qrCodeUrl} 
                    alt="UPI QR Code" 
                    className="w-48 h-48 object-contain rounded-xl shadow-lg mb-4"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Scan to Pay</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">UPI ID</span>
                    <span className="font-bold text-primary">{paymentSettings?.upiId || 'Not Configured'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Payee Name</span>
                    <span className="font-bold text-zinc-900">{paymentSettings?.upiName || 'Not Configured'}</span>
                  </div>
                </div>

                {paymentSettings?.instructions && (
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Instructions</p>
                    <p className="text-xs text-zinc-600 leading-relaxed">{paymentSettings.instructions}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Transaction ID / UTR Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter 12-digit UTR number"
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-primary transition-all font-mono"
                    value={paymentDetails.upiId}
                    onChange={e => setPaymentDetails({...paymentDetails, upiId: e.target.value})}
                  />
                  <p className="text-[10px] text-zinc-400 italic">Enter the transaction ID after successful payment for verification.</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={processPayment}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            Pay ₹{selectedPackage?.price} Now
          </button>

          <button
            onClick={() => setPaymentStep('payment')}
            className="w-full text-zinc-500 font-bold py-2 hover:text-zinc-900 transition-all"
          >
            Change Payment Method
          </button>
        </div>
      )}

      {/* Addons Section */}
      {paymentStep === 'plans' && packages.some(p => p.type === 'addon') && (
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
