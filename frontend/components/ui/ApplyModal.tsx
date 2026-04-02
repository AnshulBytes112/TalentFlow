import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { UploadCloud, FileText } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  profileResumeUrl?: string;
  onSuccess: () => void;
}

const ApplyModal: React.FC<ApplyModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  profileResumeUrl,
  onSuccess,
}) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileResumeUrl && !resumeFile) {
      toast.error('Resume is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (coverLetter) formData.append('coverLetter', coverLetter);
      if (resumeFile) formData.append('resume', resumeFile);

      await api.post(`/api/applications/${jobId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Application submitted successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Application"
      description={`Applying for ${jobTitle} at ${companyName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Resume Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-text-primary">Resume <span className="text-accent-danger">*</span></label>
          
          {profileResumeUrl && !resumeFile && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-accent-primary bg-accent-primary/5">
              <FileText className="text-accent-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">Using profile resume</p>
                <a href={profileResumeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-accent-primary underline">View current</a>
              </div>
            </div>
          )}

          <div className="relative">
             <input
               type="file"
               id="resume"
               accept=".pdf,.doc,.docx"
               onChange={handleFileChange}
               className="hidden"
             />
             <label
               htmlFor="resume"
               className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-accent-primary hover:bg-accent-primary/5 transition-colors cursor-pointer group"
             >
               <UploadCloud className="text-text-tertiary group-hover:text-accent-primary mb-2" size={24} />
               <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">
                 {resumeFile ? resumeFile.name : (profileResumeUrl ? "Upload a different resume" : "Click to upload your resume (PDF, DOCX)")}
               </span>
             </label>
          </div>
        </div>

        {/* Cover Letter Section */}
        <div className="space-y-3 relative">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-text-primary">Cover Letter <span className="text-text-tertiary font-normal">(Optional)</span></label>
            <span className="text-xs text-text-tertiary font-mono">{coverLetter.length} / 500</span>
          </div>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            maxLength={500}
            rows={5}
            className="w-full p-4 rounded-xl border border-border bg-bg-secondary text-white focus:outline-none focus:ring-1 focus:ring-accent-primary resize-none"
            placeholder="Tell us why you're a great fit for this role..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Submit Application
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ApplyModal;
