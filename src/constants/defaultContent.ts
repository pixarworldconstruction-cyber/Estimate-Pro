import { LandingPageContent, SupportContent } from '../types';

export const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  hero: {
    title: "Build Your Vision with Precision",
    subtitle: "The ultimate construction management platform for contractors and builders. Streamline estimates, manage clients, and grow your business.",
    ctaText: "Start Your Free Trial",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592dee58c460?auto=format&fit=crop&q=80&w=1920"
  },
  about: {
    title: "Why Choose Construction Pro?",
    subtitle: "Everything you need to manage your construction projects in one place.",
    features: [
      { icon: "FileText", title: "Smart Estimates", desc: "Create professional, detailed estimates in minutes with our intuitive builder." },
      { icon: "Users", title: "Client Management", desc: "Keep track of all your clients, projects, and communication history." },
      { icon: "PenTool", title: "Civil Drawing", desc: "Access professional civil drawing tools for your construction projects. Free for all users." },
      { icon: "TrendingUp", title: "Business Insights", desc: "Get real-time data on your business performance and project profitability." }
    ]
  },
  packages: {
    title: "Simple, Transparent Pricing",
    subtitle: "Choose the plan that's right for your business growth.",
    plans: [
      {
        name: "Free Trial",
        price: "0",
        period: "14 Days",
        features: ["All Pro Features", "Up to 5 Staff Members", "50 Estimates Limit", "Basic Support"]
      },
      {
        name: "Pro",
        price: "3,999",
        period: "Month",
        features: ["Unlimited Estimates", "Up to 20 Staff Members", "Advanced Analytics", "Priority Support", "Custom Branding"],
        popular: true
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "Year",
        features: ["Unlimited Everything", "Dedicated Account Manager", "Custom Integrations", "Onboarding Support", "SLA Guarantee"]
      }
    ]
  },
  contact: {
    title: "Get In Touch",
    subtitle: "Have questions? We're here to help you get started.",
    email: "support@constructionpro.com",
    phone: "+91 98765 43210",
    address: "123 Construction Way, Suite 100, Mumbai, Maharashtra 400001"
  },
  privacyPolicy: "# Privacy Policy\n\nYour privacy is important to us...",
  termsAndConditions: "# Terms and Conditions\n\nBy using our service, you agree to..."
};

export const DEFAULT_SUPPORT_CONTENT: SupportContent = {
  name: "Super Admin Support",
  email: "admin@constructionpro.com",
  phone: "+91 98765 43210",
  availability: "Monday - Saturday, 10:00 AM - 6:00 PM IST",
  note: "For urgent technical issues, please call our support line directly."
};
