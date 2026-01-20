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

const CREDIT_CARDS = [
  'Amazon ICICI Pay Credit Card',
  'American Express Platinum Card',
  'Amex Gold Credit Card',
  'Amex Membership Rewards Credit Card',
  'Amex Platinum Reserve Credit Card',
  'Amex Platinum Travel Credit Card',
  'Amex Smart Earn Credit Card',
  'AU Altura Credit Card',
  'AU Altura Plus Credit Card',
  'AU Bank LIT Credit Card',
  'AU Nomo Credit Card',
  'AU Zenith Plus Credit Card',
  'Axis Airtel Credit Card',
  'Axis Atlas Credit Card',
  'Axis Aura Credit Card',
  'Axis Bank ACE Credit Card',
  'Axis Bank FreeCharge Plus Credit Card',
  'Axis Bank Horizon Credit Card',
  'Axis Bank Privilege Credit Card',
  'Axis Cashback Credit Card',
  'Axis Flipkart Credit Card',
  'Axis IOCL Credit Card',
  'Axis Magnus Credit Card',
  'Axis Magnus Burgundy Credit Card',
  'Axis Miles and More World Credit Card',
  'Axis MyZone Credit Card',
  'Axis Neo Credit Card',
  'Axis Privilege Amex Credit Card',
  'Axis Rewards Credit Card',
  'Axis Samsung Infinite Credit Card',
  'Axis Samsung Signature Credit Card',
  'Axis Select Credit Card',
  'Axis Shoppers Stop Credit Card',
  'Axis SpiceJet Bank Voyage Black Credit Card',
  'Axis SpiceJet Bank Voyage Credit Card',
  'Axis Supermoney Rupay Card',
  'Axis Vistara Platinum',
  'Biz Black Metal Edition Credit Card',
  'EazyDiner IndusInd Bank Platinum Credit Card',
  'Flipkart SBI Credit Card',
  'HDFC 6E Rewards Indigo Credit Card',
  'HDFC Bank Bharat Credit Card',
  'HDFC Biz First Credit Card',
  'HDFC Biz Grow Credit Card',
  'HDFC Business Moneyback Credit card',
  'HDFC Credit Cards',
  'HDFC Diners Club Black Credit Card',
  'HDFC Diners Club Black Metal Credit Card',
  'HDFC Diners Privilege Credit Card',
  'HDFC Freedom Credit Card',
  'HDFC Indian Oil Credit Card',
  'HDFC Infinia Credit Card',
  'HDFC IRCTC Credit Card',
  'HDFC Marriott Bonvoy Credit Card',
  'HDFC Millennia Credit Card',
  'HDFC Moneyback Credit Card',
  'HDFC MoneyBack Plus Credit Card',
  'HDFC PIXEL Play Credit Card',
  'HDFC Regalia Gold Credit Card',
  'HDFC RuPay Credit Card',
  'HDFC Shoppers Stop Black Credit Card',
  'HDFC Shoppers Stop Credit Card',
  'HDFC Superia Airline Credit Card',
  'HDFC Swiggy Credit Card',
  'HDFC Tata Neu Plus Credit Card',
  'HSBC Cashback Credit Card',
  'HSBC Live Plus Credit Card',
  'HSBC Platinum Rewards Credit Card',
  'HSBC Premier Credit Card',
  'HSBC RuPay Cashback Credit Card',
  'HSBC Travel One Credit Card',
  'ICICI HPCL Coral Credit Card',
  'ICICI HPCL Super Saver Credit Card',
  'ICICI MakeMyTrip Credit Card',
  'ICICI Platinum Chip Credit Card',
  'ICICI Rubyx Credit Card',
  'ICICI Sapphiro Credit Card',
  'IDFC CLUB VISTARA CREDIT CARD',
  'IDFC First Ashva Credit Card',
  'IDFC First Classic Credit Card',
  'IDFC FIRST Dual Indigo Credit Card',
  'IDFC First Mayura Credit Card',
  'IDFC FIRST Millennia Credit Card',
  'IDFC FIRST Power Credit Card',
  'IDFC First Power Plus Credit Card',
  'IDFC First Private Credit Card',
  'IDFC FIRST Select Credit Card',
  'IDFC First SWYP Credit Card',
  'IDFC First WOW Credit Card',
  'IDFC Wealth Credit Card',
  'Indian Oil RBL Bank XTRA Credit Card',
  'Indian Oil Visa',
  'IndianOil Axis Bank Rupay Credit Card',
  'IndianOil RBL Bank Credit Card',
  'IndusInd Bank Legend Credit Card',
  'IndusInd Credit Card',
  'IndusInd EazyDiner Credit Card',
  'IndusInd Legend Credit Card',
  'IndusInd Platinum Aura Edge Credit Card',
  'IndusInd Platinum RuPay Credit Card',
  'IndusInd Tiger Credit Card',
  'IRCTC RBL Credit Card',
  'IRCTC SBI Platinum Card',
  'Jupiter Edge Credit Card',
  'Kiwi Klick Credit Card',
  'Kotak Delight Platinum Credit Card',
  'Kotak Essentia Platinum Credit Card',
  'Kotak IndianOil Platinum Credit Card',
  'Kotak League Platinum Credit Card',
  'Kotak Mojo Platinum Credit card',
  'Kotak Zen Signature Credit Card',
  'LIC Axis Bank Platinum Credit Card',
  'LIC Axis Bank Signature Credit Card',
  'MakeMyTrip ICICI Bank Signature Credit Card',
  'Myntra Kotak Credit Card',
  'Paytm HDFC Bank Select Credit Card',
  'Pop Club Credit Card',
  'PVR Kotak Platinum Credit Card',
  'RBL Bank Cookies Credit Card',
  'RBL Bank Play Credit Card',
  'RBL Insignia Preferred Credit Card',
  'RBL Platinum Maxima Plus Credit Card',
  'RBL Shoprite Credit Card',
  'RBL Super Binge Credit Card',
  'RBL World Safari Credit Card',
  'SBI AURUM Credit CARD',
  'SBI BPCL Credit Card',
  'SBI BPCL Octane Credit Card',
  'SBI Card Miles Credit Card',
  'SBI Card Pulse Credit Card',
  'SBI Cashback Credit Card',
  'SBI ELITE Card',
  'SBI Elite Credit Card',
  'SBI Prime Credit Card',
  'SBI Simply Click Credit Card',
  'SBI Simply Save Credit Card',
  'SBM Kredit.Pe Credit Card',
  'SBM ZET Magnet Credit Card',
  'Scapia Credit Card',
  'Standard Chartered EaseMytrip Credit Card',
  'Standard Chartered Emirates Platinum Credit Card',
  'Standard Chartered Platinum Rewards Card',
  'Standard Chartered Smart Credit Card',
  'Standard Chartered Ultimate',
  'Tata Neu Infinity HDFC Bank Credit Card',
  'Tata Neu Infinity SBI Card',
  'Tata Neu Infinity SBI Credit Card',
  'Times Black ICICI Bank Credit Card',
  'YES BANK ACE Credit Card',
  'Zagg Rupay Credit Card'
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
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [highlightedBankIndex, setHighlightedBankIndex] = useState(0);
  const [highlightedCardIndex, setHighlightedCardIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cardDropdownRef = useRef<HTMLDivElement>(null);

  const filteredBanks = BANKS.filter(bank =>
    bank.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCards = cardName
    ? CREDIT_CARDS.filter(card => card.toLowerCase().includes(cardName.toLowerCase())).slice(0, 10)
    : CREDIT_CARDS.slice(0, 10);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedBankIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    setHighlightedCardIndex(0);
  }, [cardName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Use setTimeout to allow button onClick to fire first
      setTimeout(() => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsBankOpen(false);
          setSearchQuery('');
        }
        if (cardDropdownRef.current && !cardDropdownRef.current.contains(event.target as Node)) {
          setIsCardOpen(false);
        }
      }, 0);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for bank dropdown
  const handleBankKeyDown = (e: React.KeyboardEvent) => {
    if (!isBankOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedBankIndex(prev => Math.min(prev + 1, filteredBanks.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedBankIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredBanks[highlightedBankIndex]) {
      e.preventDefault();
      setBankName(filteredBanks[highlightedBankIndex]);
      setIsBankOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Escape') {
      setIsBankOpen(false);
      setSearchQuery('');
    }
  };

  // Keyboard navigation for card dropdown
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (!isCardOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCardIndex(prev => Math.min(prev + 1, filteredCards.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCardIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCards[highlightedCardIndex]) {
      e.preventDefault();
      setCardName(filteredCards[highlightedCardIndex]);
      setIsCardOpen(false);
    } else if (e.key === 'Escape') {
      setIsCardOpen(false);
    }
  };

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] relative border-2 border-gray-200 animate-in zoom-in-95 fade-in duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-transparent to-purple-50/50 pointer-events-none z-0" />

        <div className="relative px-6 py-5 flex justify-between items-start border-b-2 border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">New Audit</h2>
            <p className="text-sm text-gray-600 mt-1">Upload MITC documents for extraction</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out -mr-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative px-6 pb-6 space-y-5 mt-5">
          {isLimitReached && (
            <div className="bg-amber-50 border-2 border-amber-200 p-3 rounded-xl flex gap-2 text-amber-800 text-sm">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="font-medium">Pipeline at capacity. New jobs will queue.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Issuing Bank</label>
              <button
                type="button"
                onClick={() => setIsBankOpen(!isBankOpen)}
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm text-left outline-none transition-all duration-300 ease-out flex items-center justify-between ${isBankOpen ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <span className={bankName ? 'text-gray-900 font-medium' : 'text-gray-400'}>{bankName || 'Select bank...'}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ease-out ${isBankOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>

              {isBankOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b-2 border-gray-100">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleBankKeyDown}
                      placeholder="Search banks..."
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all duration-300"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredBanks.length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-500">No banks found</div>
                    ) : (
                      filteredBanks.map((bank, index) => (
                        <button
                          key={bank}
                          onClick={() => { setBankName(bank); setIsBankOpen(false); setSearchQuery(''); }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                            index === highlightedBankIndex
                              ? 'bg-violet-100 text-violet-900'
                              : 'text-gray-700'
                            }`}
                        >
                          <span>{bank}</span>
                          {bankName === bank && (
                            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 relative" ref={cardDropdownRef}>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Card Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => {
                  setCardName(e.target.value);
                  setIsCardOpen(true);
                }}
                onFocus={() => setIsCardOpen(true)}
                onKeyDown={handleCardKeyDown}
                placeholder="e.g. Regalia Gold"
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm text-gray-900 outline-none transition-all duration-300 ease-out placeholder:text-gray-400 ${isCardOpen ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-200 hover:border-gray-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'}`}
              />

              {isCardOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCards.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span>New card: <strong className="text-gray-900">{cardName}</strong></span>
                      </div>
                    ) : (
                      filteredCards.map((card, index) => (
                        <button
                          key={card}
                          onClick={() => { setCardName(card); setIsCardOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                            index === highlightedCardIndex
                              ? 'bg-violet-100 text-violet-900'
                              : 'text-gray-700'
                            }`}
                        >
                          <span>{card}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Source Documents</label>
              <span className="text-xs text-gray-500 font-mono">Max {MAX_FILES} PDFs</span>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-out cursor-pointer ${isDragging
                  ? 'bg-violet-50 border-violet-400'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400 hover:bg-gray-100'
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
                <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ease-out ${isDragging ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-500'
                  }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {isDragging ? (
                    <span className="text-violet-600 font-semibold">Drop files here</span>
                  ) : (
                    <>Drop PDFs or <span className="text-gray-900 font-semibold">browse</span></>
                  )}
                </p>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 font-semibold">{files.length}/{MAX_FILES} files</span>
                <button onClick={() => setFiles([])} className="text-xs text-rose-600 hover:text-rose-700 font-semibold transition-colors duration-200">Clear all</button>
              </div>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex justify-between items-center p-3 bg-white border-2 border-gray-200 rounded-xl group hover:border-gray-300 hover:shadow-sm transition-all duration-200 ease-out">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-rose-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h3v6h-1v-5h-2v-.5l.5-.5zm4.5 0h1l1.5 3.5L17 13h1v6h-1v-4l-1.25 2.5h-.5L14 15v4h-1v-6z" /></svg>
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm text-gray-900 font-medium truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 transition-all duration-200 ease-out p-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-3 items-center p-3 rounded-xl bg-rose-50 border-2 border-rose-200">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="relative px-6 py-4 border-t-2 border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all duration-200 ease-out rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLimitReached || !bankName || !cardName || files.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold rounded-lg hover:shadow-xl shadow-lg shadow-violet-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out disabled:shadow-none"
          >
            Start Extraction
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
