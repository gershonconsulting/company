import type { ActionsPayload, LeadAction, ActionKind, ActionReason } from "./actions";
import { ACTION_META } from "./actions";

const NAMES = ["Northwind Labs", "Helio Robotics", "Kestrel Bio", "Arcadia Foods", "Blue Fjord AI", "Lumen Diagnostics",
  "Quarry Systems", "Tidewater Energy", "Orbis Payments", "Pinecrest Medical", "Vela Mobility", "Granite Analytics"];
const STAGES = ["5. Proposal Sent", "4. Pitched", "7. Negotiating", "2. Contacted", "3. Scheduled", "6. Nurtering"];
const KINDS: ActionKind[][] = [["reply", "closing"], ["overdue"], ["hot-open", "no-next-step"], ["going-cold"], ["reply"], ["no-next-step"],
  ["closing"], ["overdue", "going-cold"], ["hot-open"], ["no-next-step"], ["going-cold"], ["closing", "no-next-step"]];
const TEXT: Record<ActionKind, ActionReason> = {
  "reply":        { kind: "reply", text: "They emailed 2 days ago — no reply from us yet", todo: "Reply today" },
  "overdue":      { kind: "overdue", text: "1 task overdue (3 days)", todo: "Do it or reschedule it in Streak" },
  "hot-open":     { kind: "hot-open", text: "Opened our last email 4× — no reply yet", todo: "Call or send a short follow-up while it's warm" },
  "closing":      { kind: "closing", text: "Proposal Sent — no touch for 12 days", todo: "Follow up on the proposal / next step" },
  "going-cold":   { kind: "going-cold", text: "No touch for 27 days", todo: "Re-engage before it goes stale" },
  "no-next-step": { kind: "no-next-step", text: "No next step scheduled", todo: "Add a task with a due date in Streak" },
};

export function demoActions(): ActionsPayload {
  const leads: LeadAction[] = NAMES.map((name, i) => {
    const reasons = KINDS[i].map((k) => TEXT[k]);
    const owner = i % 2 ? "aina.rama@gershonconsulting.com" : "olivier@gershonconsulting.com";
    return {
      key: `demo${i}`, name, url: "https://www.streak.com", stageName: STAGES[i % STAGES.length], stageOrder: i,
      priority: (["High", "Medium", "Low", "Medium"] as const)[i % 4], owners: [owner], ownerNames: [owner.split("@")[0]],
      daysSinceTouch: 2 + i * 3, lastTouchType: "EMAIL",
      score: reasons.reduce((s, r) => s + ACTION_META[r.kind].weight, 0) + 20 - i,
      reasons, winProb: 0.3, value: 4000 + (12 - i) * 900,
    };
  });
  const counts = { reply: 2, overdue: 2, "hot-open": 2, closing: 3, "going-cold": 3, "no-next-step": 4 } as Record<ActionKind, number>;
  return {
    generatedAt: new Date().toISOString(), leads, counts,
    owners: [{ email: "olivier@gershonconsulting.com", name: "olivier", count: 6 }, { email: "aina.rama@gershonconsulting.com", name: "aina.rama", count: 6 }],
    value: {
      clv: 13865, clvSource: "settings", total: 412000,
      byStage: STAGES.map((s, i) => ({ stageName: s, order: i, count: 10 + i * 3, prob: [0.45, 0.3, 0.65, 0.1, 0.2, 0.1][i], value: [96000, 104000, 90000, 21000, 35000, 32000][i] })),
      top: leads.slice(0, 8),
    },
    objectives: [
      { key: "leadsPerWeek", label: "New leads per week", value: 6, unit: "/wk", target: 14.4, direction: "min", met: false, help: "Last 4 weeks' average vs our best quarter." },
      { key: "worked30", label: "Pipeline worked in last 30 days", value: 35, unit: "%", target: 50, direction: "min", met: false, help: "Share of live leads touched in 30 days." },
      { key: "nextStep", label: "Leads with a next step", value: 71, unit: "%", target: 70, direction: "min", met: true, help: "Share of live leads with an open task." },
      { key: "waiting", label: "Prospects waiting on our reply", value: 2, unit: "#", target: 0, direction: "max", met: false, help: "Should always be zero." },
      { key: "overdue", label: "Leads with overdue tasks", value: 2, unit: "#", target: 0, direction: "max", met: false, help: "Do them or reschedule." },
      { key: "stale", label: "Stale leads (> 90 days)", value: 8, unit: "%", target: 10, direction: "max", met: true, help: "Re-engage or recycle." },
      { key: "highShare", label: "High-priority share", value: 12, unit: "%", target: 10, direction: "min", met: true, help: "Qualify harder." },
    ],
    history: [0, 1, 2, 3].map((w) => ({
      date: new Date(Date.now() - (3 - w) * 7 * 86400000).toISOString().slice(0, 10),
      values: { leadsPerWeek: 12 - w * 2, worked30: 48 - w * 4, nextStep: 64 + w * 2, waiting: w, overdue: 1 + w % 2, stale: 7 + w * 0.3, highShare: 11 + w * 0.3 },
    })),
  };
}
