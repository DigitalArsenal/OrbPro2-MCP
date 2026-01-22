/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// WebGPU types
interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

interface GPUAdapter {
  readonly name: string;
  readonly features: ReadonlySet<string>;
  readonly limits: Record<string, number>;
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

interface GPUDeviceDescriptor {
  requiredFeatures?: string[];
  requiredLimits?: Record<string, number>;
}

interface GPUDevice {
  readonly features: ReadonlySet<string>;
  readonly limits: Record<string, number>;
  readonly lost: Promise<GPUDeviceLostInfo>;
  destroy(): void;
}

interface GPUDeviceLostInfo {
  readonly reason: 'unknown' | 'destroyed';
  readonly message: string;
}

interface Navigator {
  readonly gpu?: GPU;
}
