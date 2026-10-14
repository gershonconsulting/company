// ─────────────────────────────────────────────────────────────────────────────
// GENERATED from the Straight-in track-record analysis (2026-10-13).
// Sources: Straight-in weekly sheet (Mar 2021 – Jun 2026, 76 client tabs),
// client.gershonCRM Straight-in reports (Jul – Sep 2026) and the finance roster
// "Gershon Consulting - Finance - Invoices 2026 - Old Clients".
// Retention uses a Kaplan–Meier estimate over contract dates, so clients still
// with us count as "still running" instead of being treated as gone.
// Refresh this file when a new history export is made; do not hand-edit numbers.
// ─────────────────────────────────────────────────────────────────────────────
export interface HistoryBenchmarks {
  asOf: string; source: string
  clientsRun: number; totalOpportunities: number
  lifetimeMeanMonths: number; lifetimeMedianMonths: number      // contract lifetime (retention-adjusted)
  campaignMeanMonths: number; campaignMedianMonths: number      // first → last Straight-in week
  oppsPerClientMean: number; oppsPerClientMedian: number
  oppsPerClientMonthMean: number; oppsPerClientMonthMedian: number
  acceptanceRate: number; invitesPerClientMonth: number
  retention: Record<string, number>                               // share of clients still with us after N months
  survivalCurve: [number, number][]                               // [months, share still with us]
  rampOppsByMonth: number[]; rampClients: number[]                // avg opportunities in campaign month 1..12
  retentionSample: number
  signingsByYear: Record<string, number>                          // new clients started per year (2026 = to 13 Oct)
}
export const HISTORY_BENCHMARKS: HistoryBenchmarks = {"asOf": "2026-10-13", "source": "Straight-in weekly sheet (Mar 2021 to Jun 2026), client.gershonCRM Straight-in reports (Jul to Sep 2026) and the Gershon finance roster (Invoices 2026, Old Clients)", "clientsRun": 71, "totalOpportunities": 5669, "lifetimeMeanMonths": 16.3, "lifetimeMedianMonths": 9.3, "campaignMeanMonths": 8.7, "campaignMedianMonths": 4.8, "oppsPerClientMean": 80, "oppsPerClientMedian": 25, "oppsPerClientMonthMean": 6.9, "oppsPerClientMonthMedian": 5.0, "acceptanceRate": 31.1, "invitesPerClientMonth": 579, "retention": {"1": 1.0, "2": 0.971, "3": 0.956, "6": 0.719, "9": 0.554, "12": 0.379, "18": 0.274, "24": 0.183, "36": 0.133, "48": 0.089, "60": 0.089}, "survivalCurve": [[0, 1.0], [1.63, 0.9853], [1.71, 0.9706], [2.93, 0.9557], [3.26, 0.94], [3.98, 0.9246], [4.1, 0.9089], [4.11, 0.8935], [4.13, 0.8781], [4.16, 0.8627], [4.21, 0.847], [4.74, 0.831], [4.77, 0.815], [4.93, 0.7994], [5.0, 0.7837], [5.43, 0.7674], [5.56, 0.751], [5.76, 0.7347], [5.94, 0.7187], [6.05, 0.7028], [6.17, 0.6868], [6.38, 0.6708], [6.45, 0.6545], [6.97, 0.6385], [7.01, 0.6221], [7.24, 0.6058], [7.78, 0.5889], [7.96, 0.5721], [8.38, 0.5542], [9.07, 0.5364], [9.13, 0.5017], [9.31, 0.4838], [9.49, 0.4665], [9.84, 0.4486], [10.76, 0.4307], [10.97, 0.4134], [11.05, 0.3962], [11.97, 0.379], [13.59, 0.3609], [14.57, 0.3437], [14.67, 0.3266], [15.97, 0.3094], [16.35, 0.2912], [16.51, 0.274], [19.13, 0.2569], [20.03, 0.2398], [21.02, 0.2213], [21.09, 0.2029], [23.09, 0.1826], [28.68, 0.1598], [30.71, 0.1332], [40.89, 0.0888]], "rampOppsByMonth": [4.4, 7.2, 7.6, 7.9, 8.7, 7.8, 7.8, 5.8, 4, 6.9, 5.5, 8.5], "rampClients": [71, 69, 64, 58, 44, 37, 28, 28, 23, 14, 12, 11], "retentionSample": 68, "signingsByYear": {"2021": 9, "2022": 24, "2023": 17, "2024": 16, "2025": 10, "2026": 8}}
