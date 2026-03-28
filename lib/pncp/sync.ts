import { pncpClient } from './client';
import { PNCPMapper } from './mapper';
import { Opportunity, SyncJob } from '@/lib/intel/types';
import { generateId } from '@/lib/utils';
import { calculateMatchesForCompany } from '@/lib/intel/services';
import { archiveExpiredOpportunities, deleteOldExpiredOpportunities } from '@/lib/services/opportunities';
import { getTestDataset } from './test-dataset';
import { RESILIENCE_TEST_DATASET } from './test-resilience-dataset';

// In-memory storage for demonstration
// In a real app, these would be database calls
let centralOpportunities: Opportunity[] = [];
let syncJobs: SyncJob[] = [];

export interface SyncError {
  id: string;
  sync_job_id: string;
  source: string;
  source_external_id?: string;
  error_type: string;
  error_message: string;
  raw_payload_excerpt: string;
  created_at: string;
}

let syncErrors: SyncError[] = [];

export interface SyncOptions {
  mode?: 'production' | 'test' | 'resilience';
}

/**
 * PNCP Sync Service
 * Handles the incremental synchronization logic
 */
export class PNCPSyncService {
  /**
   * Runs an incremental sync
   */
  async runSync(options: SyncOptions = { mode: 'production' }): Promise<SyncJob> {
    const startedAt = new Date().toISOString();
    const lastSuccessfulJob = this.getLastSuccessfulJob();
    
    // Window start is the end of the last successful job, or a default date
    const syncWindowStart = lastSuccessfulJob ? lastSuccessfulJob.sync_window_end : '2024-01-01';
    const syncWindowEnd = new Date().toISOString().split('T')[0]; // Current date

    // Arquivar vencidas e remover expiradas há mais de 30 dias antes de inserir novos dados
    await archiveExpiredOpportunities();
    await deleteOldExpiredOpportunities();

    const job: SyncJob = {
      id: generateId(),
      source: 'pncp',
      started_at: startedAt,
      status: 'running',
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      records_skipped: 0,
      sync_window_start: syncWindowStart,
      sync_window_end: syncWindowEnd,
    };

    syncJobs.unshift(job);

    try {
      if (options.mode === 'test' || options.mode === 'resilience') {
        // Test/Resilience Mode: Use local dataset
        const testData = options.mode === 'test' ? getTestDataset() : RESILIENCE_TEST_DATASET;
        job.records_fetched = testData.length;

        for (const item of testData) {
          try {
            const result = await this.processOpportunity(item);
            if (result === 'inserted') job.records_inserted++;
            else if (result === 'updated') job.records_updated++;
            else job.records_skipped++;
          } catch (error: any) {
            // Log error per record (Scenario F)
            this.logError(job.id, item, error);
          }
        }
      } else {
        // Production Mode: Use real API
        let pagina = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await pncpClient.getContratacoesByPublicacao({
            dataInicial: syncWindowStart,
            dataFinal: syncWindowEnd,
            pagina: pagina,
            tamanhoPagina: 50,
          });

          job.records_fetched += response.data.length;

          for (const item of response.data) {
            try {
              const result = await this.processOpportunity(item);
              if (result === 'inserted') job.records_inserted++;
              else if (result === 'updated') job.records_updated++;
              else job.records_skipped++;
            } catch (error: any) {
              this.logError(job.id, item, error);
            }
          }

          if (response.paginasRestantes > 0 && pagina < 5) { // Limit pages for demo
            pagina++;
          } else {
            hasMore = false;
          }
        }
      }

      job.status = 'success';
      job.finished_at = new Date().toISOString();
      
      // After sync, trigger match calculation
      await calculateMatchesForCompany('current-company-id');
      
    } catch (error: any) {
      job.status = 'failed';
      job.error_message = error.message;
      job.finished_at = new Date().toISOString();
    }

    return job;
  }

  /**
   * Logs a sync error for a specific record
   */
  private logError(jobId: string, payload: any, error: any) {
    const syncError: SyncError = {
      id: generateId(),
      sync_job_id: jobId,
      source: 'pncp',
      source_external_id: payload.numeroControlePNCP || payload.numeroControlePncp || payload.numero_controle_pncp,
      error_type: 'PARSING_ERROR',
      error_message: error.message,
      raw_payload_excerpt: JSON.stringify(payload).substring(0, 200) + '...',
      created_at: new Date().toISOString(),
    };
    syncErrors.unshift(syncError);
  }

  /**
   * Processes a single PNCP contract: inserts or updates
   */
  private async processOpportunity(pncpData: any): Promise<'inserted' | 'updated' | 'skipped'> {
    const externalId = pncpData.numeroControlePNCP || pncpData.numeroControlePncp || pncpData.numero_controle_pncp;
    
    // Mapper will throw if ID is missing
    const opportunity = PNCPMapper.toOpportunity(pncpData);
    
    const existingIndex = centralOpportunities.findIndex(o => o.numero_controle_pncp === externalId);

    if (existingIndex >= 0) {
      const existing = centralOpportunities[existingIndex];
      
      // Only update if the source data is newer
      if (opportunity.source_updated_at > existing.source_updated_at) {
        // Preserve local ID and imported_at
        opportunity.id = existing.id;
        opportunity.imported_at = existing.imported_at;
        
        centralOpportunities[existingIndex] = opportunity;
        return 'updated';
      }
      return 'skipped';
    } else {
      centralOpportunities.push(opportunity);
      return 'inserted';
    }
  }

  /**
   * Resets the central opportunities base (for testing)
   */
  resetBase() {
    centralOpportunities = [];
    syncJobs = [];
    syncErrors = [];
  }

  /**
   * Gets the last successful sync job
   */
  private getLastSuccessfulJob(): SyncJob | undefined {
    return syncJobs.find(j => j.status === 'success');
  }

  /**
   * Adds a manual opportunity to the central base
   */
  addManualOpportunity(opportunity: Opportunity) {
    centralOpportunities.unshift(opportunity);
  }

  /**
   * Getters for UI monitoring
   */
  getJobs() { return syncJobs; }
  getOpportunities() { return centralOpportunities; }
  getErrors() { return syncErrors; }
}

export const pncpSyncService = new PNCPSyncService();
