/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Xanh dương làm màu chủ đạo, nền trắng/xám nhạt đã có sẵn (bg-white, bg-slate-50 trong toàn bộ UI).
        // Mọi nơi trong app đều dùng qua class `brand-*` (btn-primary, logo, gradient trang chủ...) nên chỉ cần
        // đổi bảng màu này là đổi theme toàn site, không phải sửa từng component.
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
