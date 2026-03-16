import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Mail, Lock, Loader2, AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 p-8 md:p-12 border border-slate-100">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-6 shadow-lg shadow-indigo-200">
              <Smartphone className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              {isLogin ? 'مرحباً بك مجدداً' : 'إنشاء حساب جديد'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isLogin ? 'سجل دخولك للوصول إلى لوحة التحكم' : 'ابدأ رحلتك مع FixMaster اليوم'}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-800 text-sm">
              <div className="flex items-center gap-3 mb-3 font-bold">
                <Settings className="animate-spin-slow" size={20} />
                <span>تنبيه: الإعدادات غير مكتملة</span>
              </div>
              <p className="leading-relaxed">
                يرجى إضافة مفاتيح <strong>Supabase</strong> في قائمة <strong>Settings</strong> لتتمكن من استخدام التطبيق.
                <br />
                <code className="block mt-2 p-2 bg-white/50 rounded-lg text-xs font-mono">
                  VITE_SUPABASE_URL<br />
                  VITE_SUPABASE_ANON_KEY
                </code>
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 mr-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-right"
                  placeholder="example@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 mr-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-right"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>{isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
          >
            <span>العودة للرئيسية</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
