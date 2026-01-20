-- ValidateKaro Database Schema - UPDATED
-- Run this SQL in your Supabase SQL Editor

-- Create audits table (if not exists - this is safe to re-run)
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id TEXT UNIQUE NOT NULL,
    bank_name TEXT NOT NULL,
    card_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    confidence_score INTEGER DEFAULT 0,
    extracted_data JSONB,
    issues JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_files table to track uploaded PDFs
CREATE TABLE IF NOT EXISTS public.audit_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audits_process_id ON public.audits(process_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_files_audit_id ON public.audit_files(audit_id);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_files ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow all operations on audits" ON public.audits;
CREATE POLICY "Allow all operations on audits" ON public.audits
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on audit_files" ON public.audit_files;
CREATE POLICY "Allow all operations on audit_files" ON public.audit_files
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_audits_updated_at ON public.audits;
CREATE TRIGGER update_audits_updated_at
    BEFORE UPDATE ON public.audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.audits TO anon, authenticated;
GRANT ALL ON public.audit_files TO anon, authenticated;
