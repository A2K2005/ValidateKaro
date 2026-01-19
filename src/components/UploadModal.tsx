import React, { useState, useRef, useEffect } from 'react';

const BANKS = [
  'American Express',
  'AU Small Finance Bank',
  'Axis',
  'Bajaj Finserv',
  'Federal Bank',
  'HDFC',
  'HSBC Bank',
  'ICICI Bank',
  'IDFC',
  'IndusInd Bank',
  'Kotak',
  'RBL Bank',
  'SBM Bank',
  'SBI',
  'Standard Chartered Bank',
  'Yes Bank'
];

const MAX_FILES = 10;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (bankName: string, cardName: string, files: File[]) => void;
  activeCount: number;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onStart, activeCount }) => {
  const [bankName, setBankName] = useState('');
  const [cardName, setCardName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredBanks = BANKS.filter(bank => 
    bank.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBankOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let selectedFiles: File[] = [];
    if ('files' in e.target && e.target.files) {
      selectedFiles = Array.from(e.target.files);
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      selectedFiles = Array.from(e.dataTransfer.files);
    }

    if (selectedFiles.length === 0) return;

    const pdfs = selectedFiles.filter(f => f.type === 'application/pdf');
    const duplicates = pdfs.filter(f => files.some(existing => existing.name === f.name && existing.size === f.size));

    if (pdfs.length !== selectedFiles.length) {
      setError('Only PDF documents are accepted.');
      return;
    }
    
    if (duplicates.length > 0) {
      setError(`${duplicates[0].name} already added.`);
      return;
    }

    const validFiles = pdfs.filter(f => 
      !files.some(existing => existing.name === f.name && existing.size === f.size)
    );

    const newTotal = files.length + validFiles.length;
    if (newTotal > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed. You have ${files.length}, trying to add ${validFiles.length}.`);
      return;
    }
    
    setError(null);
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!bankName || !cardName || files.length === 0) {
      setError('All fields are required.');
      return;
    }
    onStart(bankName, cardName, files);
    setBankName('');
    setCardName('');
    setFiles([]);
    onClose();
  };

  const isLimitReached = activeCount >= 3;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
<div className="bg-[#18181b] rounded-xl shadow-2xl w-full max-w-[560px] overflow-hidden relative border border-zinc-700/50 animate-in zoom-in-95 fade-in duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] via-transparent to-cyan-500/[0.03] pointer-events-none" />
        
<div className="relative px-6 py-5 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">New Audit</h2>
              <p className="text-sm text-zinc-400 mt-1">Upload MITC documents for extraction</p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-white/10 transition-all duration-300 ease-out -mr-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="relative px-6 pb-6 space-y-5">
          {isLimitReached && (
            <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg flex gap-2 text-amber-400/90 text-[11px]">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>Pipeline at capacity. New jobs will queue.</span>
            </div>
          )}

<div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Issuing Bank</label>
                <button 
                  type="button"
                  onClick={() => setIsBankOpen(!isBankOpen)}
                  className={`w-full px-4 py-3 bg-zinc-800 border rounded-lg text-sm text-left outline-none transition-all duration-300 ease-out flex items-center justify-between ${
                    isBankOpen ? 'border-violet-500/50 ring-1 ring-violet-500/20' : 'border-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  <span className={bankName ? 'text-zinc-100' : 'text-zinc-400'}>{bankName || 'Select bank...'}</span>
                  <svg className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ease-out ${isBankOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {isBankOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-2.5 border-b border-zinc-700">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search banks..."
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-500 transition-all duration-300"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto smooth-scrollbar">
                      {filteredBanks.length === 0 ? (
                        <div className="px-4 py-4 text-center text-sm text-zinc-500">No banks found</div>
                      ) : (
                        filteredBanks.map(bank => (
                          <button
                            key={bank}
                            onClick={() => { setBankName(bank); setIsBankOpen(false); setSearchQuery(''); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-200 ease-out flex items-center justify-between group ${
                              bankName === bank 
                                ? 'bg-violet-500/20 text-violet-300' 
                                : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                            }`}
                          >
                            <span>{bank}</span>
                            {bankName === bank && (
                              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Card Name</label>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Regalia Gold"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-zinc-100 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all duration-300 ease-out placeholder:text-zinc-400"
                />
              </div>
            </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Source Documents</label>
              <span className="text-xs text-zinc-500 font-mono">Max {MAX_FILES} PDFs</span>
            </div>
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-out cursor-pointer ${
                isDragging 
                  ? 'bg-violet-500/10 border-violet-500/50' 
                  : 'bg-zinc-800/50 border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileChange(e);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                multiple 
                accept=".pdf" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                className="hidden" 
              />
              <div className="space-y-3">
                <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ease-out ${
                  isDragging ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <p className="text-sm text-zinc-400">
                  {isDragging ? (
                    <span className="text-violet-400">Drop files here</span>
                  ) : (
                    <>Drop PDFs or <span className="text-zinc-100 font-medium">browse</span></>
                  )}
                </p>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400 font-mono">{files.length}/{MAX_FILES} files</span>
                <button onClick={() => setFiles([])} className="text-xs text-rose-400 hover:text-rose-300 transition-colors duration-200">Clear all</button>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto smooth-scrollbar">
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex justify-between items-center p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg group hover:border-zinc-600 transition-all duration-200 ease-out">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-md bg-rose-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-rose-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h3v6h-1v-5h-2v-.5l.5-.5zm4.5 0h1l1.5 3.5L17 13h1v6h-1v-4l-1.25 2.5h-.5L14 15v4h-1v-6z"/></svg>
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs text-zinc-200 truncate">{file.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-all duration-200 ease-out p-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

{error && (
            <div className="flex gap-2.5 items-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}
          </div>

          <div className="relative px-6 py-4 border-t border-zinc-700 flex justify-end gap-3 bg-zinc-800/50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-all duration-200 ease-out rounded-md hover:bg-white/10">
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isLimitReached || !bankName || !cardName || files.length === 0}
              className="btn-press px-5 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold rounded-md hover:from-violet-500 hover:to-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out shadow-lg shadow-violet-500/20 disabled:shadow-none"
            >
              Start Extraction
            </button>
          </div>
        </div>
      </div>
    );
};

export default UploadModal;
