/**
 * Voter Information Portal — MongoDB edition
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Database,
  AlertCircle,
  ChevronRight,
  RefreshCcw,
  Users,
  Filter,
  X,
} from 'lucide-react';
import { Voter } from './types';
import * as api from './services/apiService';
import { VoterCard } from './components/VoterCard';

type Mode = 'auto' | 'part';

export default function App() {
  // Unified search query (auto-detects EPIC / mobile / name)
  const [query, setQuery] = useState('');
  const [partNo, setPartNo] = useState('');
  const [mode, setMode] = useState<Mode>('auto');

  // Optional filters
  const [showFilters, setShowFilters] = useState(false);
  const [gender, setGender] = useState<'' | 'M' | 'F' | 'O'>('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<Voter[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [secondaryFilter, setSecondaryFilter] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-search as you type (300ms debounce) for "auto" mode
  useEffect(() => {
    if (mode !== 'auto') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() && !gender && !minAge && !maxAge) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, gender, minAge, maxAge, mode]);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setSelectedVoter(null);
    try {
      // EPIC fast path
      const trimmed = query.trim();
      if (mode === 'auto' && /^[A-Z]{2,4}\d{5,10}$/i.test(trimmed) && !gender && !minAge && !maxAge) {
        const v = await api.searchByEpic(trimmed);
        if (v) {
          setSelectedVoter(v);
          setResults([]);
          setTotalCount(0);
        } else {
          setError('No voter found with this EPIC number.');
          setResults([]);
        }
        return;
      }

      const opts: api.SearchOpts = {
        q: trimmed || undefined,
        gender: gender || undefined,
        minAge: minAge ? parseInt(minAge, 10) : undefined,
        maxAge: maxAge ? parseInt(maxAge, 10) : undefined,
        limit: 100,
      };
      const { data, total } = await api.search(opts);
      setResults(data);
      setTotalCount(total);
      if (data.length === 0) setError('No matching records found.');
    } catch (e: any) {
      setError(e.message || 'Search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPart = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!partNo) return setError('Enter a Part Number.');
    setLoading(true);
    setError(null);
    setSelectedVoter(null);
    try {
      const { data, total } = await api.fetchByPart(partNo, 1, 500);
      setResults(data);
      setTotalCount(total);
      if (data.length === 0) setError(`No voters found in Part ${partNo}.`);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch part.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (adhar: string, mobile: string) => {
    if (!selectedVoter) return;
    setIsUpdating(true);
    try {
      const msg = await api.updateVoter(selectedVoter.EpicNumber, adhar, mobile);
      alert(msg);
      setSelectedVoter({ ...selectedVoter, AdharNumber: adhar, MobileNumber: mobile });
    } catch (e: any) {
      alert('Error updating: ' + (e.message || 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Client-side secondary filter (cheap, on already-fetched results)
  const filteredResults = secondaryFilter
    ? results.filter(v => {
        const f = secondaryFilter.toLowerCase();
        return (
          String(v.SerialNo).includes(f) ||
          v.ElectorsName?.toLowerCase().includes(f) ||
          v.ElectorNameHindi?.toLowerCase().includes(f) ||
          v.EpicNumber?.toLowerCase().includes(f)
        );
      })
    : results;

  const clearAll = () => {
    setQuery('');
    setPartNo('');
    setGender('');
    setMinAge('');
    setMaxAge('');
    setSecondaryFilter('');
    setResults([]);
    setTotalCount(0);
    setSelectedVoter(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 font-sans relative overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="glow-orb -top-20 -right-20 w-96 h-96 bg-indigo-500"></div>
        <div className="glow-orb top-40 -left-20 w-72 h-72 bg-blue-500" style={{ animationDelay: '1s' }}></div>
        <div className="glow-orb bottom-20 right-1/3 w-80 h-80 bg-purple-500" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-30 shadow-2xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="primary-gradient p-3 rounded-2xl text-white shadow-2xl shadow-indigo-500/50 transform hover:scale-110 transition-transform duration-300">
                <Database size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                  Voter <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Portal</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">MongoDB · Real-time Lookup</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
          {/* Search bar — central, big, fast */}
          <div className="glass-card p-6 md:p-8 mb-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 primary-gradient"></div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setMode('auto'); setResults([]); setTotalCount(0); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  mode === 'auto' ? 'primary-gradient text-white shadow-lg' : 'bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                <Search size={12} className="inline mr-2" />
                Quick Search
              </button>
              <button
                onClick={() => { setMode('part'); setResults([]); setTotalCount(0); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  mode === 'part' ? 'primary-gradient text-white shadow-lg' : 'bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                <Users size={12} className="inline mr-2" />
                Browse by Part
              </button>
            </div>

            {mode === 'auto' ? (
              <>
                <div className="relative">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search by EPIC number, name, or mobile..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-14 pr-5 py-4 font-bold text-white text-lg focus:border-indigo-400 transition-all outline-none placeholder:text-white/20"
                  />
                  {(query || gender || minAge || maxAge) && (
                    <button
                      onClick={clearAll}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Clear"
                    >
                      <X size={16} className="text-white/40" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-3 px-2">
                  Type to search instantly · supports English & Hindi names
                </p>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                >
                  <Filter size={12} />
                  {showFilters ? 'Hide Filters' : 'Add Filters'}
                  {(gender || minAge || maxAge) && (
                    <span className="ml-1 bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full">
                      {[gender, minAge || maxAge ? 'age' : ''].filter(Boolean).length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/10">
                        <div>
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Gender</label>
                          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                            {([['', 'All'], ['M', 'M'], ['F', 'F'], ['O', 'O']] as const).map(([val, label]) => (
                              <button
                                key={val}
                                onClick={() => setGender(val as any)}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                                  gender === val ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Min Age</label>
                          <input
                            type="number"
                            min={0}
                            value={minAge}
                            onChange={(e) => setMinAge(e.target.value)}
                            className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2 font-bold text-white focus:border-indigo-400 outline-none"
                            placeholder="18"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Max Age</label>
                          <input
                            type="number"
                            min={0}
                            value={maxAge}
                            onChange={(e) => setMaxAge(e.target.value)}
                            className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2 font-bold text-white focus:border-indigo-400 outline-none"
                            placeholder="60"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              /* Browse by Part Mode */
              <form onSubmit={fetchPart} className="flex gap-3">
                <div className="relative flex-1">
                  <Users size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="number"
                    autoFocus
                    placeholder="Enter Part Number (e.g. 1, 50, 286)..."
                    value={partNo}
                    onChange={(e) => setPartNo(e.target.value)}
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-14 pr-5 py-4 font-bold text-white text-lg focus:border-indigo-400 transition-all outline-none placeholder:text-white/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !partNo}
                  className="primary-button group px-8 disabled:opacity-50"
                >
                  <div className="absolute inset-0 primary-gradient group-hover:scale-110 transition-transform duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    {loading ? <RefreshCcw className="animate-spin" size={16} /> : <Search size={16} />}
                    Fetch
                  </div>
                </button>
              </form>
            )}
          </div>

          {/* Results area */}
          <div className="min-h-[400px] relative">
            <AnimatePresence mode="wait">
              {loading && !selectedVoter && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20"
                >
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-white/10 border-t-indigo-400 rounded-full animate-spin"></div>
                    <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={32} />
                  </div>
                  <p className="mt-6 font-black uppercase text-xs tracking-[0.3em] text-white/40 animate-pulse">Querying MongoDB...</p>
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card border-red-500/30 bg-red-500/10 p-6 flex items-center gap-5 text-red-200 mb-6"
                >
                  <div className="bg-red-500/20 p-3 rounded-2xl">
                    <AlertCircle size={28} className="shrink-0 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase text-xs tracking-widest text-red-400 mb-1">No Match</h3>
                    <p className="text-sm font-medium opacity-80">{error}</p>
                  </div>
                </motion.div>
              )}

              {selectedVoter ? (
                <motion.div
                  key="voter-details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <button
                    onClick={() => setSelectedVoter(null)}
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10"
                  >
                    <ChevronRight size={14} className="rotate-180" /> Back to results
                  </button>
                  <VoterCard voter={selectedVoter} onUpdate={handleUpdate} isUpdating={isUpdating} />
                </motion.div>
              ) : results.length > 0 && !loading ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Results header + secondary filter */}
                  <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pb-4 border-b border-white/10">
                    <h2 className="font-black uppercase text-xs tracking-widest text-white/60">
                      {filteredResults.length === results.length
                        ? `${results.length} of ${totalCount.toLocaleString()} matches`
                        : `${filteredResults.length} of ${results.length} (filtered)`}
                    </h2>
                    {results.length > 5 && (
                      <input
                        type="text"
                        placeholder="Filter results (name, serial, EPIC)..."
                        value={secondaryFilter}
                        onChange={(e) => setSecondaryFilter(e.target.value)}
                        className="bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:border-emerald-400 transition-all outline-none placeholder:text-white/20 max-w-xs"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredResults.slice(0, 200).map((voter, index) => (
                      <motion.button
                        key={`${voter.EpicNumber}-${voter.SerialNo}-${index}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.015, 0.3) }}
                        whileHover={{ scale: 1.02, translateY: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedVoter(voter)}
                        className="glass-card p-6 text-left group overflow-hidden relative"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="bg-indigo-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-indigo-300 border border-indigo-500/30">
                            {voter.EpicNumber}
                          </div>
                          <div className="text-[10px] font-black text-white/40 uppercase tracking-tighter">
                            P{voter.PartNo} · S{voter.SerialNo}
                          </div>
                        </div>
                        <h3 className="font-black text-white text-lg group-hover:text-indigo-300 transition-colors uppercase tracking-tight leading-tight">
                          {voter.ElectorsName}
                        </h3>
                        <p className="text-sm font-medium text-white/40 mb-3">{voter.ElectorNameHindi}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-white/30">
                          <span>{voter.ElectorGender}</span>
                          <span>·</span>
                          <span>Age {voter.Age}</span>
                          {voter.MobileNumber && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-400/70">📱</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {filteredResults.length === 0 && (
                    <div className="py-20 text-center glass-card border-dashed">
                      <p className="text-white/40 font-black uppercase text-xs tracking-widest">No results match the filter</p>
                    </div>
                  )}
                  {results.length > 200 && (
                    <p className="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest mt-6">
                      Showing first 200 · refine filters to narrow down
                    </p>
                  )}
                </motion.div>
              ) : !loading && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center py-20 px-4"
                >
                  <div className="relative mb-8">
                    <div className="absolute -inset-4 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <div className="bg-white/5 p-12 rounded-full border border-white/10 relative">
                      <Database className="text-white/20" size={80} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Ready</h3>
                  <p className="text-sm font-medium text-white/30 max-w-md mx-auto leading-relaxed">
                    {mode === 'auto'
                      ? 'Type an EPIC number, voter name, or mobile number above. Results stream in instantly.'
                      : 'Enter a Part Number to browse all voters in that polling station.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="mt-auto border-t border-white/10 bg-black/20 backdrop-blur-3xl py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <Database className="text-indigo-400" size={18} />
              </div>
              <span className="font-black uppercase tracking-[0.2em] text-[10px] text-white/60">Voter Portal · MongoDB</span>
            </div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">© 2026 Secured Data Infrastructure</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
