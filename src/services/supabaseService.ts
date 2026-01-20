import { ValidationProcess, AuditLog } from '../types';
import {
  createAudit,
  updateAudit,
  getAudits,
  deleteAudit as deleteSupabaseAudit,
  uploadPDF,
  Audit,
  getPDFUrl
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
    data: audit.extracted_data as unknown as ValidationProcess['data'],
    issues: (audit.issues || []) as unknown as ValidationProcess['issues'],
    logs: [],
    timestamp: audit.created_at
  };
}

export const supabaseService = {
  async createAuditRecord(bankName: string, cardName: string, processId: string): Promise<Audit | null> {
    console.log('📝 Creating audit record in Supabase...');
    try {
      const audit = await createAudit(bankName, cardName, processId);
      if (audit) {
        console.log('✅ Audit record created:', audit.id);
        return audit;
      } else {
        console.error('❌ Failed to create audit record');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error creating audit record:', error.message);
      return null;
    }
  },

  async saveProcess(process: ValidationProcess): Promise<void> {
    // Only update the existing audit, don't create a new one to avoid duplicate key errors
    await updateAudit(process.process_id, {
      status: process.status,
      confidence_score: process.confidence_score,
      extracted_data: process.data as unknown as Record<string, unknown>,
      issues: process.issues as unknown as Audit['issues']
    });

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
      extracted_data: updates.data as unknown as Record<string, unknown>,
      issues: updates.issues as unknown as Audit['issues']
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
    console.log(`📤 Uploading ${files.length} files to Supabase Storage...`);
    console.log(`   Process ID: ${processId}, Audit ID: ${auditId || 'N/A'}`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`   📄 Uploading file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      // Use auditId if available, otherwise use processId as folder
      const folderId = auditId || processId;
      const path = await uploadPDF(file, folderId);

      if (path) {
        console.log(`   ✅ File ${i + 1} uploaded: ${path}`);
        paths.push(path);
      } else {
        console.error(`   ❌ File ${i + 1} upload failed`);
      }
    }

    console.log(`📤 Upload complete: ${paths.length}/${files.length} files uploaded`);
    return paths;
  },

  getPDFUrl(filePath: string): string {
    return getPDFUrl(filePath);
  }
};
