import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Construction, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  FileText, 
  Calculator, 
  ShieldCheck,
  Package,
  Mail,
  Phone,
  MapPin,
  Menu,
  X,
  TrendingUp,
  Info
} from 'lucide-react';
import Login from './Login';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LandingPageContent } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../constants/defaultContent';
import ReactMarkdown from 'react-markdown';

const ICON_MAP: { [key: string]: any } = {
  FileText,
  Users,
  Calculator,
  Package,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Info
};

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
  const [showLegal, setShowLegal] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'landingPage'), (doc) => {
      if (doc.exists()) {
        setContent(doc.data() as LandingPageContent);
      }
    });
    return () => unsubscribe();
  }, []);

  if (showLogin) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowLogin(false)}
          className="fixed top-8 left-8 z-[100] px-4 py-2 bg-white rounded-xl shadow-sm border border-zinc-100 font-bold text-zinc-600 hover:text-primary transition-all flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Home
        </button>
        <Login />
      </div>
    );
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary/10 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Construction className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-zinc-900 tracking-tight">Estimate Pro</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('home')} className="text-sm font-bold text-zinc-600 hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection('about')} className="text-sm font-bold text-zinc-600 hover:text-primary transition-colors">About</button>
            <button onClick={() => scrollToSection('packages')} className="text-sm font-bold text-zinc-600 hover:text-primary transition-colors">Packages</button>
            <button onClick={() => scrollToSection('contact')} className="text-sm font-bold text-zinc-600 hover:text-primary transition-colors">Contact Us</button>
            <button 
              onClick={() => setShowLogin(true)}
              className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
            >
              Login / Sign Up
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-zinc-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-zinc-100 p-6 space-y-4 shadow-xl"
            >
              <button onClick={() => scrollToSection('home')} className="block w-full text-left text-lg font-bold text-zinc-600">Home</button>
              <button onClick={() => scrollToSection('about')} className="block w-full text-left text-lg font-bold text-zinc-600">About</button>
              <button onClick={() => scrollToSection('packages')} className="block w-full text-left text-lg font-bold text-zinc-600">Packages</button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left text-lg font-bold text-zinc-600">Contact Us</button>
              <button 
                onClick={() => setShowLogin(true)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg"
              >
                Login / Sign Up
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full text-primary text-sm font-bold">
              <ShieldCheck className="w-4 h-4" />
              Trusted by 500+ Contractors
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-zinc-900 leading-[1.1] tracking-tight">
              {content.hero.title.split('. ').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {i === arr.length - 1 ? <span className="text-primary">{part}</span> : <>{part}. <br /></>}
                </React.Fragment>
              ))}
            </h1>
            <p className="text-xl text-zinc-500 leading-relaxed max-w-lg">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
              >
                {content.hero.ctaText} <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className="px-8 py-4 bg-zinc-50 text-zinc-600 rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-all flex items-center justify-center"
              >
                Learn More
              </button>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square bg-zinc-100 rounded-[60px] overflow-hidden shadow-2xl relative z-10">
              <img 
                src={content.hero.imageUrl} 
                alt="Hero"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-zinc-50 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-zinc-900">{content.about.title}</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto">{content.about.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.about.features.map((feature, i) => {
              const Icon = ICON_MAP[feature.icon] || Info;
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[32px] border border-zinc-100 hover:shadow-xl hover:shadow-zinc-200/50 transition-all group"
                >
                  <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-zinc-900">{content.packages.title}</h2>
            <p className="text-zinc-500">{content.packages.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.packages.plans.map((pkg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "p-10 rounded-[40px] border relative flex flex-col",
                  pkg.popular ? "bg-zinc-900 border-zinc-800 text-white shadow-2xl scale-105 z-10" : "bg-white border-zinc-100 text-zinc-900"
                )}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-black mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">₹{pkg.price}</span>
                    <span className={pkg.popular ? "text-zinc-400" : "text-zinc-500"}>/{pkg.period}</span>
                  </div>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {pkg.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <CheckCircle2 className={cn("w-5 h-5", pkg.popular ? "text-primary" : "text-primary")} />
                      <span className="font-medium">{f}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowLogin(true)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all",
                    pkg.popular ? "bg-primary text-white hover:bg-primary/90" : "bg-zinc-900 text-white hover:bg-zinc-800"
                  )}
                >
                  Choose {pkg.name}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-zinc-900 text-white px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-8">
            <h2 className="text-5xl font-black leading-tight">{content.contact.title}</h2>
            <p className="text-zinc-400 text-xl leading-relaxed">
              {content.contact.subtitle}
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Mail className="text-primary" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Email Us</div>
                  <div className="text-lg font-bold">{content.contact.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Phone className="text-primary" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Call Us</div>
                  <div className="text-lg font-bold">{content.contact.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <MapPin className="text-primary" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Visit Us</div>
                  <div className="text-lg font-bold">{content.contact.address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 space-y-6">
            <h3 className="text-2xl font-bold">Send us a message</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">First Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Last Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
              <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Message</label>
              <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all h-32" />
            </div>
            <button className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all">
              Send Message
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Construction className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-black text-zinc-900 tracking-tight">Estimate Pro</span>
          </div>
          <div className="text-zinc-400 text-sm font-medium">
            © 2026 Construction Estimate Pro. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowLegal('privacy')}
              className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => setShowLegal('terms')}
              className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      <AnimatePresence>
        {showLegal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLegal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-2xl font-black text-zinc-900">
                  {showLegal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
                </h2>
                <button 
                  onClick={() => setShowLegal(null)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto prose prose-zinc max-w-none">
                <ReactMarkdown>
                  {showLegal === 'privacy' ? content.privacyPolicy : content.termsAndConditions}
                </ReactMarkdown>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
