/**
 * DM Locker Pro - Hardware Acceleration Detection Utility
 * Detects browser support for WebGPU acceleration with seamless WASM/CPU fallback.
 * Strictly non-blocking and fails gracefully on unsupported hardware/browsers.
 */

export async function detectHardwareCapabilities() {
  const capabilities = {
    webgpu: false,
    wasm: typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function',
    mode: 'CPU Sandbox (Baseline)',
    label: 'CPU / Standard Engine',
    details: 'Browser standard execution environment'
  };

  // Check WebGPU availability safely
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        capabilities.webgpu = true;
        capabilities.mode = 'WebGPU (Hardware Accelerated)';
        capabilities.label = 'WebGPU Hardware Accelerated';
        capabilities.details = 'Local neural and tensor operations accelerated via WebGPU adapter';
        return capabilities;
      }
    } catch {
      // Hardware denied or WebGPU flag disabled; fallback
    }
  }

  // Fallback to WebAssembly
  if (capabilities.wasm) {
    capabilities.mode = 'WASM / High-Performance CPU';
    capabilities.label = 'WebAssembly (WASM) High-Performance Fallback';
    capabilities.details = 'Local SIMD / WASM execution active for zero-knowledge document processing';
  }

  return capabilities;
}
