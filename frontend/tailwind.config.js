/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif"
        ],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      colors: {
        ink: "#090d16",
        mist: "#f8fafc",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          DEFAULT: "#4f46e5"
        },
        sidebar: {
          DEFAULT: "#0b0f19",
          hover: "#151c2e",
          active: "#1e293b",
          border: "#1e293b"
        }
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        elevated: "0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)",
        modal: "0 20px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
        glow: "0 0 20px -5px rgba(79, 70, 229, 0.25)"
      },
      animation: {
        "fade-in": "fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in": "slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "aurora": "aurora 20s ease-in-out infinite alternate",
        "pulse-subtle": "pulseSubtle 6s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        slideIn: {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        aurora: {
          "0%": {
            transform: "translate(0px, 0px) scale(1) rotate(0deg)"
          },
          "50%": {
            transform: "translate(30px, -20px) scale(1.08) rotate(3deg)"
          },
          "100%": {
            transform: "translate(-20px, 20px) scale(0.96) rotate(-3deg)"
          }
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.75" }
        }
      }
    }
  },
  plugins: []
};

