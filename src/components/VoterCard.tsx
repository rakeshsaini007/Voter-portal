import React, { useState, useEffect } from 'react';
import { Voter } from '../types';
import { motion } from 'motion/react';
import { Save, User, Hash, FileText, Phone, CreditCard, Calendar, UserCheck, RefreshCcw } from 'lucide-react';

interface VoterCardProps {
  voter: Voter;
  onUpdate: (adhar: string, mobile: string) => Promise<void>;
  isUpdating: boolean;
}

const Field = ({ icon: Icon, label, value, readOnly = true, onChange, error, type = "text", placeholder }: any) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
      <Icon size={12} className="text-white/30" /> {label}
    </label>
    {readOnly ? (
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold min-h-[48px] flex items-center backdrop-blur-sm shadow-inner group-hover:bg-white/10 transition-colors">
        {value || <span className="opacity-20 font-normal">No Data</span>}
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-white/5 border-2 rounded-2xl px-5 py-4 text-white font-black text-lg outline-none focus:ring-4 transition-all ${error ? 'border-red-500/50 focus:ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-400/50 shadow-lg'}`}
      />
    )}
    {error && <span className="text-[10px] text-red-400 font-black uppercase tracking-wider mt-1 ml-1">{error}</span>}
  </div>
);

export const VoterCard: React.FC<VoterCardProps> = ({ voter, onUpdate, isUpdating }) => {
  const [adhar, setAdhar] = useState(String(voter.AdharNumber || ''));
  const [mobile, setMobile] = useState(String(voter.MobileNumber || ''));
  const [errors, setErrors] = useState<{ adhar?: string; mobile?: string }>({});

  useEffect(() => {
    setAdhar(String(voter.AdharNumber || ''));
    setMobile(String(voter.MobileNumber || ''));
  }, [voter]);

  const validate = () => {
    const newErrors: { adhar?: string; mobile?: string } = {};
    
    if (adhar && !/^\d{12}$/.test(adhar)) {
      newErrors.adhar = "Aadhaar must be 12 digits";
    }
    
    if (!mobile) {
      newErrors.mobile = "Mobile number is mandatory";
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      newErrors.mobile = "Enter a valid 10-digit Indian mobile number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      await onUpdate(adhar, mobile);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden max-w-4xl w-full mx-auto relative group"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 primary-gradient"></div>
      
      <div className="bg-white/5 p-8 border-b border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-white uppercase">{voter.ElectorsName}</h2>
            <p className="text-indigo-400/80 text-xl font-bold">{voter.ElectorNameHindi}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl min-w-[200px]">
            <span className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">Epic Reference</span>
            <span className="text-2xl font-black text-white tracking-widest block">{voter.EpicNumber}</span>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        <div>
          <div className="section-title mb-6">Demographic Profile</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Field icon={Hash} label="AC No" value={voter.ACNo} />
            <Field icon={FileText} label="Part No" value={voter.PartNo} />
            <Field icon={FileText} label="Serial No" value={voter.SerialNo} />
            <Field icon={UserCheck} label="Gender" value={voter.ElectorGender} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field icon={Calendar} label="Age" value={voter.Age} />
          <Field icon={User} label="Relative Type" value={voter.Relativetype} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
          <Field icon={User} label="Relative Name" value={voter.RelativeName} />
          <Field icon={User} label="Relative Name (Hindi)" value={voter.RelativeNameHindi} />
        </div>

        <div className="relative group">
          <div className="absolute -top-10 left-0">
            <div className="section-title">Identity Update Node</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-indigo-500/5 p-8 rounded-3xl border-2 border-indigo-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
            <div className="relative z-10">
              <Field 
                icon={CreditCard} 
                label="Adhar Number" 
                value={adhar} 
                readOnly={false} 
                onChange={setAdhar}
                error={errors.adhar}
                placeholder="12 digit Aadhaar"
              />
            </div>
            <div className="relative z-10">
              <Field 
                icon={Phone} 
                label="Mobile Number *" 
                value={mobile} 
                readOnly={false} 
                onChange={setMobile}
                error={errors.mobile}
                placeholder="10 digit Mobile"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="primary-button group min-w-[240px]"
          >
            <div className={`absolute inset-0 transition-transform duration-500 group-hover:scale-110 ${isUpdating ? 'bg-slate-600' : 'primary-gradient'}`}></div>
            <div className="relative flex items-center gap-3 px-10 py-5 text-white">
              {isUpdating ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
              <span className="text-base font-black tracking-widest">{isUpdating ? 'Updating Node...' : 'Commit Changes'}</span>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
