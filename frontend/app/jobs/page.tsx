'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import JobCard from '@/components/ui/JobCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import * as Slider from '@radix-ui/react-slider';
import { Search, MapPin, X, Filter, Loader2, Briefcase } from 'lucide-react';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'remote'];
const WORK_MODES = ['remote', 'onsite', 'hybrid'];
const JOB_CATEGORIES = ['engineering', 'design', 'marketing', 'sales', 'customer-support', 'product', 'data-science', 'hr', 'finance', 'operations', 'other'];
const EXPERIENCE_LEVELS = ['entry-level', 'mid-level', 'senior-level', 'executive'];

const QUICK_FILTERS = [
  { label: 'Remote', value: 'remote', field: 'workMode' },
  { label: 'Full-time', value: 'full-time', field: 'jobType' },
  { label: 'Entry Level', value: 'entry-level', field: 'experience' },
  { label: 'Senior Level', value: 'senior-level', field: 'experience' }
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 200000]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounced Search Trigger
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedLocation, setDebouncedLocation] = useState(location);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedLocation(location);
    }, 500);
    return () => clearTimeout(handler);
  }, [search, location]);

  const fetchJobs = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) setIsLoading(true);
      else setIsFetchingMore(true);

      const params = new URLSearchParams();
      params.append('page', isLoadMore ? (page + 1).toString() : '1');
      params.append('limit', '12');

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (debouncedLocation) params.append('location', debouncedLocation);
      if (selectedTypes.length === 1) params.append('jobType', selectedTypes[0]); // Backend mostly expects 1 type in getJobs unless modified
      if (selectedModes.length > 0) params.append('workMode', selectedModes[0]); 
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedExperience) params.append('experience', selectedExperience);
      if (salaryRange[0] > 0) params.append('salaryMin', salaryRange[0].toString());
      if (salaryRange[1] < 200000) params.append('salaryMax', salaryRange[1].toString());
      if (skills.length > 0) params.append('skills', skills.join(','));

      const response = await api.get('/api/jobs', { params });
      
      const newJobs = response.data.data;
      if (isLoadMore) {
        setJobs(prev => [...prev, ...newJobs]);
        setPage(prev => prev + 1);
      } else {
        setJobs(newJobs);
        setPage(1);
      }
      
      setHasMore(newJobs.length === 12); // If we received less than limit, no more pages
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [debouncedSearch, debouncedLocation, selectedTypes, selectedModes, salaryRange, skills, page]);

  // Initial Fetch & Filter Changes
  useEffect(() => {
    fetchJobs(false);
  }, [debouncedSearch, debouncedLocation, selectedTypes, selectedModes, selectedCategory, selectedExperience, salaryRange, skills]); // eslint-disable-line

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim() && !skills.includes(skillInput.trim())) {
      e.preventDefault();
      setSkills(prev => [...prev, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  const toggleFilter = (array: string[], setArray: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (array.includes(item)) {
      setArray(prev => prev.filter(i => i !== item));
    } else {
      setArray(prev => [...prev, item]);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setLocation('');
    setSelectedTypes([]);
    setSelectedModes([]);
    setSelectedCategory('');
    setSelectedExperience('');
    setSalaryRange([0, 200000]);
    setSkills([]);
  };

  const toggleMobileFilters = () => setShowMobileFilters(!showMobileFilters);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-accent-primary selection:text-bg-primary">
      <Navbar />

      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <section className="container max-w-7xl mx-auto px-6 lg:px-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-6"
          >
            <h1 className="text-5xl md:text-6xl font-display font-black text-white tracking-tight leading-[1.1]">
              Find Your Next <span className="text-accent-primary italic">Opportunity</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium tracking-tight">
              Discover roles at the world's most innovative companies.
            </p>

            <div className="relative flex flex-col sm:flex-row items-center gap-4 p-2 bg-elevated/50 border border-border rounded-2xl md:rounded-full backdrop-blur-md">
                <div className="w-full flex-1 relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                      <Search size={20} />
                   </div>
                   <input 
                     type="text" 
                     placeholder="Job title, keyword, or company..."
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-0 placeholder:text-text-tertiary font-medium"
                   />
                </div>
                <div className="w-full sm:w-auto h-[1px] sm:h-8 sm:w-[1px] bg-border mx-2" />
                <div className="w-full flex-1 relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                      <MapPin size={20} />
                   </div>
                   <input 
                     type="text" 
                     placeholder="City, state, or Remote"
                     value={location}
                     onChange={e => setLocation(e.target.value)}
                     className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-0 placeholder:text-text-tertiary font-medium"
                   />
                </div>
                <Button className="w-full sm:w-auto px-8 py-4 rounded-xl md:rounded-full font-bold">
                   Search
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
               <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider mr-2">Quick Filters:</span>
               {QUICK_FILTERS.map((filter, i) => (
                  <button key={i} onClick={() => {
                    if (filter.field === 'workMode') {
                      setSelectedModes([filter.value]);
                      setSelectedTypes([]);
                      setSelectedCategory('');
                      setSelectedExperience('');
                    } else if (filter.field === 'jobType') {
                      setSelectedTypes([filter.value]);
                      setSelectedModes([]);
                      setSelectedCategory('');
                      setSelectedExperience('');
                    } else if (filter.field === 'experience') {
                      setSelectedExperience(filter.value);
                      setSelectedTypes([]);
                      setSelectedModes([]);
                      setSelectedCategory('');
                    }
                    setSearch(filter.label);
                    setLocation('');
                  }} className="px-4 py-1.5 rounded-full border border-border hover:border-accent-primary text-xs font-medium text-text-secondary hover:text-white transition-colors bg-bg-secondary">
                     {filter.label}
                  </button>
               ))}
            </div>
          </motion.div>
        </section>

        {/* Layout Container */}
        <section className="container max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden w-full flex justify-end mb-4">
              <Button onClick={toggleMobileFilters} variant="outline" className="gap-2 border-border text-text-primary">
                <Filter size={18} /> Filters
              </Button>
            </div>

            {/* Filters Sidebar */}
            <AnimatePresence>
              {(showMobileFilters || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
                <motion.aside 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-32 overflow-hidden lg:overflow-visible"
                >
                  <Card className="p-6 space-y-8 bg-elevated/30 border-border">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-display font-black tracking-tight text-white uppercase">Filters</h2>
                      <button onClick={clearFilters} className="text-xs font-bold text-text-tertiary hover:text-accent-primary transition-colors">
                        Clear all
                      </button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Job Type</h3>
                      <div className="flex flex-col gap-3">
                        {JOB_TYPES.map(type => (
                          <label key={type} className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5 rounded border border-border bg-bg-secondary group-hover:border-accent-primary transition-colors">
                              {selectedTypes.includes(type) && <motion.div layoutId={`check-type-${type}`} className="w-2.5 h-2.5 bg-accent-primary rounded-sm" />}
                            </div>
                            <input type="checkbox" className="sr-only" checked={selectedTypes.includes(type)} onChange={() => toggleFilter(selectedTypes, setSelectedTypes, type)} />
                            <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors capitalize">{type.replace('-', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Work Mode</h3>
                      <div className="flex flex-col gap-3">
                        {WORK_MODES.map(mode => (
                          <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5 rounded border border-border bg-bg-secondary group-hover:border-accent-primary transition-colors">
                              {selectedModes.includes(mode) && <motion.div layoutId={`check-mode-${mode}`} className="w-2.5 h-2.5 bg-accent-primary rounded-sm" />}
                            </div>
                            <input type="checkbox" className="sr-only" checked={selectedModes.includes(mode)} onChange={() => toggleFilter(selectedModes, setSelectedModes, mode)} />
                            <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors capitalize">{mode}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Category</h3>
                       <div className="flex flex-col gap-3">
                         <select 
                           value={selectedCategory} 
                           onChange={(e) => {
                             setSelectedCategory(e.target.value);
                             setSelectedTypes([]);
                             setSelectedModes([]);
                             setSelectedExperience('');
                           }}
                           className="w-full bg-bg-primary border border-border text-text-primary focus:ring-0 focus:ring-accent-primary/20 rounded-lg px-4 py-3"
                         >
                           <option value="">All Categories</option>
                           {JOB_CATEGORIES.map(cat => (
                             <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                           ))}
                         </select>
                       </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Experience Level</h3>
                       <div className="flex flex-col gap-3">
                         <select 
                           value={selectedExperience} 
                           onChange={(e) => {
                             setSelectedExperience(e.target.value);
                             setSelectedTypes([]);
                             setSelectedModes([]);
                             setSelectedCategory('');
                           }}
                           className="w-full bg-bg-primary border border-border text-text-primary focus:ring-0 focus:ring-accent-primary/20 rounded-lg px-4 py-3"
                         >
                           <option value="">All Levels</option>
                           {EXPERIENCE_LEVELS.map(level => (
                             <option key={level} value={level}>{level.replace('-', ' ')}</option>
                           ))}
                         </select>
                       </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary flex justify-between">
                          Salary Range
                          <span className="text-accent-primary font-mono">${salaryRange[0] / 1000}k - ${salaryRange[1] >= 200000 ? '200k+' : `${salaryRange[1]/1000}k`}</span>
                       </h3>
                       <Slider.Root
                          className="relative flex items-center select-none touch-none w-full h-5 mt-4 group"
                          value={salaryRange}
                          max={200000}
                          step={5000}
                          minStepsBetweenThumbs={1}
                          onValueChange={(val: [number, number]) => setSalaryRange(val)}
                        >
                          <Slider.Track className="bg-border relative grow rounded-full h-[3px]">
                            <Slider.Range className="absolute bg-accent-primary/50 group-hover:bg-accent-primary rounded-full h-full transition-colors" />
                          </Slider.Track>
                          <Slider.Thumb className="block w-4 h-4 bg-accent-primary border border-accent-secondary rounded-full hover:scale-110 focus:outline-none focus:ring-4 focus:ring-accent-primary/20 transition-all cursor-grab active:cursor-grabbing outline-none" aria-label="Minimum Salary" />
                          <Slider.Thumb className="block w-4 h-4 bg-accent-primary border border-accent-secondary rounded-full hover:scale-110 focus:outline-none focus:ring-4 focus:ring-accent-primary/20 transition-all cursor-grab active:cursor-grabbing outline-none" aria-label="Maximum Salary" />
                        </Slider.Root>
                    </div>

                    <div className="space-y-4 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Skills</h3>
                      <div className="space-y-3">
                         <div className="flex flex-wrap gap-2">
                           {skills.map(skill => (
                              <span key={skill} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-accent-primary/10 text-accent-primary px-2 py-1 rounded border border-accent-primary/20">
                                {skill}
                                <button onClick={() => removeSkill(skill)} className="hover:text-white transition-colors outline-none"><X size={12} /></button>
                              </span>
                           ))}
                         </div>
                         <Input 
                           label="Add Skill"
                           placeholder="Type skill & enter" 
                           value={skillInput}
                           onChange={e => setSkillInput(e.target.value)}
                           onKeyDown={handleAddSkill}
                           className="bg-bg-primary h-12 py-3"
                         />
                      </div>
                    </div>
                  </Card>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 w-full min-w-0">
              
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-display font-black tracking-tight text-white capitalize">
                   {isLoading ? 'Searching...' : `${jobs.length} ${jobs.length === 1 ? 'Opportunity' : 'Opportunities'}`}
                 </h2>
                 
                 <div className="flex items-center gap-3 text-sm font-medium text-text-tertiary">
                   Sort by: <select className="bg-transparent border-none text-white focus:ring-0 outline-none cursor-pointer"><option>Most Relevant</option><option>Newest</option></select>
                 </div>
              </div>

              {isLoading ? (
                // Skeleton Grid
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-[280px] rounded-3xl border border-border bg-bg-card/50 p-6 animate-pulse flex flex-col justify-between">
                       <div className="space-y-4">
                          <div className="flex gap-4"><div className="w-12 h-12 bg-border rounded-xl" /><div className="space-y-2 flex-1"><div className="h-5 bg-border rounded w-1/2" /><div className="h-4 bg-border rounded w-1/3" /></div></div>
                          <div className="flex gap-2"><div className="w-16 h-6 bg-border rounded-full" /><div className="w-20 h-6 bg-border rounded-full" /></div>
                       </div>
                       <div className="h-[1px] bg-border w-full mt-8 my-4" />
                       <div className="h-4 bg-border rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : jobs.length > 0 ? (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {jobs.map(job => (
                      <JobCard key={job._id} job={job} />
                    ))}
                  </div>
                  
                  {hasMore && (
                    <div className="flex justify-center pt-8">
                      <Button 
                        variant="outline" 
                        onClick={() => fetchJobs(true)} 
                        isLoading={isFetchingMore}
                        className="px-8 py-4 border-border text-white hover:border-accent-primary"
                      >
                        Load More Opportunities
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-3xl bg-bg-card/30">
                  <div className="w-24 h-24 mb-6 opacity-30 bg-bg-secondary rounded-full flex items-center justify-center">
                     <Briefcase size={40} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-display font-black text-white tracking-tight mb-3">No opportunities found</h3>
                  <p className="text-text-secondary max-w-sm">
                    We couldn't find any roles matching your precise filters. Try broadening your search or clearing some tags.
                  </p>
                  <Button variant="ghost" onClick={clearFilters} className="mt-6 border border-border">
                    Clear all filters
                  </Button>
                </div>
              )}

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
