// QuikBitz Brand Tokens
const QB = {
  colors: {
    navy: "#0B1F3A",
    navy2: "#0A1730",
    textOnDark: "#FFFFFF",
    textMutedOnDark: "#D6E4FF",
    textFooterOnDark: "#9BB6D8",
    ruleOnDark: "#294B75",
    text: "#111111",
    muted: "#5B6B7A",
    rule: "#E6ECF2",
    bgPale: "#F5F8FC",
    blue1: "#1F6FEB",
    blue2: "#3B82F6",
    orange: "#FF8A00"
  },
  type: {
    brandName: 20,
    docType: 40,
    jobNumber: 16,
    label: 11,
    valueLg: 15,
    value: 13,
    footer: 10,
    h1: 18,
    h2: 13,
    body: 10,
    small: 9
  },
  spacing: {
    coverPanel: [28, 28, 20, 24],
    page: [36, 36, 36, 36],
    gapSm: 4,
    gapMd: 12,
    gapLg: 18,
    gapXL: 28
  },
  layout: {
    leftW: 250,
    rightW: 362,
    pageH: 792
  },
  logo: {
    coverWidth: 120,
    headerWidth: 70
  }
};

// Will be populated when logo loads
let QB_LOGO_DATA = null;

// Load logo as base64
async function loadQuikBitzLogo() {
  if (QB_LOGO_DATA) return QB_LOGO_DATA;
  
  try {
    const response = await fetch('/quikbitz-logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        QB_LOGO_DATA = reader.result;
        resolve(QB_LOGO_DATA);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to load QuikBitz logo:', e);
    return null;
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.QB = QB;
  window.loadQuikBitzLogo = loadQuikBitzLogo;
}
