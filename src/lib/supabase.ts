import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Audit {
  id: string;
  process_id: string;
  bank_name: string;
  card_name: string;
  status: string;
  confidence_score: number;
  extracted_data: Record<string, unknown> | null;
  issues: Array<{ field: string; message: string; severity: string }>;
  created_at: string;
  updated_at: string;
}

export interface AuditFile {
  id: string;
  audit_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

export async function createAudit(bankName: string, cardName: string, processId: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audits')
    .insert({ bank_name: bankName, card_name: cardName, process_id: processId })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating audit:', error);
    return null;
  }
  return data;
}

export async function updateAudit(processId: string, updates: Partial<Audit>): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('process_id', processId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating audit:', error);
    return null;
  }
  return data;
}

export async function getAudits(): Promise<Audit[]> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching audits:', error);
    return [];
  }
  return data || [];
}

export async function getAuditByProcessId(processId: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('process_id', processId)
    .single();
  
  if (error) {
    console.error('Error fetching audit:', error);
    return null;
  }
  return data;
}

export async function deleteAudit(processId: string): Promise<boolean> {
  const audit = await getAuditByProcessId(processId);
  if (audit) {
    const { data: files } = await supabase
      .from('audit_files')
      .select('file_path')
      .eq('audit_id', audit.id);
    
    if (files && files.length > 0) {
      await supabase.storage.from('audit-pdfs').remove(files.map(f => f.file_path));
    }
  }

  const { error } = await supabase
    .from('audits')
    .delete()
    .eq('process_id', processId);
  
  if (error) {
    console.error('Error deleting audit:', error);
    return false;
  }
  return true;
}

export async function uploadPDF(file: File, auditId: string): Promise<string | null> {
  const fileName = `${auditId}/${Date.now()}_${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from('audit-pdfs')
    .upload(fileName, file);
  
  if (uploadError) {
    console.error('Error uploading PDF:', uploadError);
    return null;
  }

  const { error: dbError } = await supabase
    .from('audit_files')
    .insert({
      audit_id: auditId,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size
    });
  
  if (dbError) {
    console.error('Error saving file record:', dbError);
  }

  return fileName;
}

export async function getAuditFiles(auditId: string): Promise<AuditFile[]> {
  const { data, error } = await supabase
    .from('audit_files')
    .select('*')
    .eq('audit_id', auditId);
  
  if (error) {
    console.error('Error fetching files:', error);
    return [];
  }
  return data || [];
}

export function getPDFUrl(filePath: string): string {
  const { data } = supabase.storage.from('audit-pdfs').getPublicUrl(filePath);
  return data.publicUrl;
}
