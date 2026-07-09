// Example presets so the demo does something meaningful on first load.
export interface Preset {
  name: string;
  text: string;
  labels: string;
}

export const PRESETS: Preset[] = [
  {
    name: "Support ticket",
    text: "My invoice charged me twice this month and I still can't log in to download the receipt.",
    labels: "billing, login issue, feature request, bug report, praise",
  },
  {
    name: "Product review",
    text: "The battery lasts all day and the screen is gorgeous, but it is honestly too heavy to hold for long.",
    labels: "battery, display, weight, price, camera",
  },
  {
    name: "News headline",
    text: "Central bank holds interest rates steady as inflation cools for a third straight month.",
    labels: "finance, sports, technology, politics, health",
  },
];
