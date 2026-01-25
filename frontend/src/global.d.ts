// Extend the Window interface to allow openMaterialsDrawer
export {}; // Ensure this file is treated as a module
declare global {
  interface Window {
    openMaterialsDrawer?: (workOrder: any) => void;
  }
}interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // add more env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}