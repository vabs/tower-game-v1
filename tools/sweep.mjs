// Parallel runner for balance-bot jobs (worker_threads). Results are identical to serial runs.
import { Worker } from 'node:worker_threads';
import os from 'node:os';

/**
 * @param {{level:number,seed:number,opts?:object}[]} jobs
 * @param {{level:number[],boss:number[]}} [tune] tune tables to install in every worker
 * @returns {Promise<object[]>} results in job order
 */
export async function sweep(jobs, tune, workers = Math.max(1, Math.min(os.cpus().length - 1, 12))) {
  const chunk = 6;
  const batches = [];
  for (let i = 0; i < jobs.length; i += chunk) batches.push({ id: batches.length, jobs: jobs.slice(i, i + chunk) });
  const results = new Array(batches.length);
  let next = 0;
  const url = new URL('./sweep-worker.mjs', import.meta.url);
  await Promise.all(
    Array.from({ length: Math.min(workers, batches.length) }, () => new Promise((resolve, reject) => {
      const w = new Worker(url);
      const feed = () => {
        if (next >= batches.length) { w.terminate(); resolve(); return; }
        w.postMessage({ ...batches[next++], tune });
      };
      w.on('message', ({ id, out }) => { results[id] = out; feed(); });
      w.on('error', reject);
      feed();
    }))
  );
  return results.flat();
}
