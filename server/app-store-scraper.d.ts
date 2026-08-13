declare module "app-store-scraper" {
  const scraper: Record<string, (...args: any[]) => Promise<any>>;
  export default scraper;
}
