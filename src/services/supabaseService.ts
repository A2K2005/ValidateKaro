import { ValidationProcess, AuditLog } from '../types';
import { 
  createAudit, 
  updateAudit, 
  getAudits, 
  deleteAudit as deleteSupabaseAudit,
  uploadPDF,
  Audit 
} from '../lib/supabase';

const DB_KEY = 'vk_audit_processes';

function mapAuditToProcess(audit: Audit): ValidationProcess {
  return {
    process_id: audit.process_id,
    card_id: `card_${audit.card_name.toLowerCase().replace(/\s+/g, '_')}`,
    bank_name: audit.bank_name,
    card_name: audit.card_name,
    status: audit.status as ValidationProcess['status'],
    storage_path: `storage/mitc/${audit.process_id}`,
    approval_gate: audit.status === 'approved' ? 'Production Ready' : audit.status === 'rejected' ? 'Must Re-run' : 'Blocked',
    confidence_score: audit.confidence_score,
    data: audit.extracted_data as ValidationProcess['data'],
    issues: (audit.issues || []) as ValidationProcess['issues'],
    logs: [],
    timestamp: audit.created_at
  };
}

export const supabaseService = {
  async saveProcess(process: ValidationProcess): Promise<void> {
    const audit = await createAudit(process.bank_name, process.card_name, process.process_id);
    if (audit) {
      await updateAudit(process.process_id, {
        status: process.status,
        confidence_score: process.confidence_score,
        extracted_data: process.data as Record<string, unknown>,
        issues: process.issues as Audit['issues']
      });
    }
    
    const existing = this.getLocalProcesses();
    const updated = [process, ...existing];
    localStorage.setItem(DB_KEY, JSON.stringify(updated));
  },

  getLocalProcesses(): ValidationProcess[] {
    const data = localStorage.getItem(DB_KEY);
    const parsed: ValidationProcess[] = data ? JSON.parse(data) : [];
    return parsed.map(p => ({
      ...p,
      logs: p.logs || [],
      issues: p.issues || []
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async getProcesses(): Promise<ValidationProcess[]> {
    try {
      const audits = await getAudits();
      if (audits.length > 0) {
        return audits.map(mapAuditToProcess);
      }
    } catch (e) {
      console.error('Error fetching from Supabase, falling back to local:', e);
    }
    return this.getLocalProcesses();
  },

  async updateStatus(id: string, status: ValidationProcess['status'], gate: ValidationProcess['approval_gate']): Promise<void> {
    await updateAudit(id, { status });
    
    const processes = this.getLocalProcesses();
    const index = processes.findIndex(p => p.process_id === id);
    if (index !== -1) {
      processes[index].status = status;
      processes[index].approval_gate = gate;
      const log: AuditLog = {
        timestamp: new Date().toISOString(),
        action: 'STATUS_UPDATE',
        details: `Status changed to ${status} (${gate})`,
        status: 'info'
      };
      processes[index].logs.push(log);
      localStorage.setItem(DB_KEY, JSON.stringify(processes));
    }
  },

  async updateProcessData(id: string, updates: Partial<ValidationProcess>): Promise<void> {
    await updateAudit(id, {
      status: updates.status,
      confidence_score: updates.confidence_score,
      extracted_data: updates.data as Record<string, unknown>,
      issues: updates.issues as Audit['issues']
    });
    
    const processes = this.getLocalProcesses();
    const index = processes.findIndex(p => p.process_id === id);
    if (index !== -1) {
      processes[index] = { ...processes[index], ...updates };
      localStorage.setItem(DB_KEY, JSON.stringify(processes));
    }
  },

  async deleteProcess(id: string): Promise<boolean> {
    await deleteSupabaseAudit(id);
    
    const processes = this.getLocalProcesses();
    const filtered = processes.filter(p => p.process_id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
    return true;
  },

  async uploadBatch(files: File[], processId: string, auditId?: string): Promise<string[]> {
    const paths: string[] = [];
    
    for (const file of files) {
      if (auditId) {
        const path = await uploadPDF(file, auditId);
        if (path) paths.push(path);
      } else {
        paths.push(`storage/mitc/${processId}/${file.name}`);
      }
    }
    
    return paths;
  }
};
