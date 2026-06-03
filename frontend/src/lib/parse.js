import ParseWorker from "./parse.worker.js?worker";

// Spawns the parse worker and resolves with { rows, columns, stats, rowCount }.
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const worker = new ParseWorker();
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (err) => { worker.terminate(); reject(err); };
    worker.postMessage({ file });
  });
}
