"use server";

import { searchSites as searchSitesQuery, type SiteMatch } from "@/lib/db/queries";

export async function searchSites(query: string): Promise<SiteMatch[]> {
  return searchSitesQuery(query);
}
