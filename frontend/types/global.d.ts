export {};

declare module "*.css";
declare module "*.scss";
declare module "*.sass";

declare global {
  interface Window {
    __VALID_EPG_IDS?: string[];
  }
}