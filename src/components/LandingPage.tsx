import React from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Wrench, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  ChevronRight,
  CheckCircle2,
  Users,
  ShoppingCart
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Smartphone className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">FixMaster</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-indigo-600 transition-colors">المميزات</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">كيف يعمل</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">الأسعار</a>
            </div>
            <button 
              onClick={onGetStarted}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              ابدأ الآن
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-right"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-6">
                <Zap size={14} />
                <span>أفضل نظام لإدارة محلات الإصلاح في المغرب</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
                سير محلك <br /> 
                <span className="text-indigo-600">بذكاء واحترافية</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg ml-auto">
                نظام متكامل لإدارة الإصلاحات، المبيعات، المخزون، والعملاء. صمم خصيصاً لمحلات الهواتف والإلكترونيات.
              </p>
              <div className="flex flex-col sm:flex-row-reverse gap-4 justify-start">
                <button 
                  onClick={onGetStarted}
                  className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-indigo-100"
                >
                  <span>ابدأ تجربتك المجانية</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all">
                  شاهد العرض التجريبي
                </button>
              </div>
              <div className="mt-10 flex items-center gap-4 justify-end">
                <div className="flex -space-x-2 space-x-reverse">
                  {[1, 2, 3, 4].map(i => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      className="w-10 h-10 rounded-full border-2 border-white"
                      alt="User"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  انضم إلى <span className="text-slate-900 font-bold">+500</span> صاحب محل في المغرب
                </p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <img 
                src="https://picsum.photos/seed/dashboard/1200/800" 
                alt="Dashboard Preview" 
                className="relative rounded-3xl shadow-2xl border border-slate-100"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">الأرباح اليومية</p>
                    <p className="text-lg font-bold text-slate-900">+1,250 DH</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-slate-600">أدوات قوية مصممة لمساعدتك على تنمية عملك</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wrench,
                title: "إدارة الإصلاحات",
                desc: "تتبع كل جهاز من الاستلام حتى التسليم مع تنبيهات تلقائية للعملاء."
              },
              {
                icon: ShoppingCart,
                title: "نظام المبيعات",
                desc: "نظام سريع وسهل لإتمام المبيعات وإصدار الفواتير الاحترافية."
              },
              {
                icon: Smartphone,
                title: "تسيير المخزون",
                desc: "راقب مخزونك من الهواتف وقطع الغيار مع تنبيهات عند انخفاض الكمية."
              },
              {
                icon: Users,
                title: "قاعدة بيانات العملاء",
                desc: "احتفظ بسجل كامل لكل عميل، مشترياته، وتاريخ إصلاحاته."
              },
              {
                icon: BarChart3,
                title: "تقارير مفصلة",
                desc: "إحصائيات دقيقة حول الأرباح، المصاريف، وأداء المحل بشكل يومي."
              },
              {
                icon: ShieldCheck,
                title: "أمان عالي",
                desc: "بياناتك مشفرة ومحمية في السحابة، مع إمكانية الوصول إليها من أي مكان."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-white rounded-3xl border border-slate-100 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-right">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed text-right">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-12">موثوق من طرف أفضل المحلات</p>
          <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-50">
            <span className="text-2xl font-black italic">TECHZONE</span>
            <span className="text-2xl font-black italic">PHONEMASTER</span>
            <span className="text-2xl font-black italic">SMARTFIX</span>
            <span className="text-2xl font-black italic">MOBILAB</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-6">هل أنت مستعد لتطوير محلك؟</h2>
              <p className="text-indigo-100 mb-10 max-w-xl mx-auto">
                ابدأ الآن مجاناً لمدة 14 يوماً. لا نحتاج لبطاقة بنكية. انضم إلى مئات المحترفين اليوم.
              </p>
              <button 
                onClick={onGetStarted}
                className="px-10 py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all shadow-xl"
              >
                ابدأ الآن مجاناً
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Smartphone className="text-white" size={16} />
            </div>
            <span className="text-lg font-bold tracking-tight">FixMaster</span>
          </div>
          <p className="text-slate-500 text-sm">© 2024 FixMaster. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-indigo-600">الشروط والأحكام</a>
            <a href="#" className="hover:text-indigo-600">سياسة الخصوصية</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
