export const Design = {
  color: {
    page: "#F4F7FA", card: "#FFFFFF", sunken: "#F7F9FB", border: "#E3E9ED", borderStrong: "#D3DCE3",
    ink: "#14202B", secondary: "#5A6B78", muted: "#8B98A1", navy: "#102A43", blue: "#176B87",
    green: "#15805B", greenSoft: "#E7F5EE", amber: "#9A6114", amberSoft: "#FDF3E2", danger: "#B3261E",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  shadow: { card: "0 1px 2px rgba(16,42,67,.04),0 4px 16px rgba(16,42,67,.05)", raised: "0 12px 34px rgba(16,42,67,.12)" },
  breakpoint: { phone: 600, tablet: 1024, wide: 1440 },
} as const;
