// Chart components
// Import: import { LineChart, BarChart, ProgressRing, StatCard } from '@/components/charts';

export { default as LineChart } from './LineChart.astro';
export { default as BarChart } from './BarChart.astro';
export { default as ProgressRing } from './ProgressRing.astro';
export { default as StatCard } from './StatCard.astro';

// Type definitions

export interface LineChartSeries {
  name: string;
  data: { label: string; value: number }[];
  color?: string;
}

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: 'green' | 'orange' | 'red' | 'white';
}

export interface StatCardProps {
  value: string | number;
  label: string;
  change?: number;
  unit?: string;
  icon?: 'up' | 'down' | 'weight' | 'reps' | 'time' | 'fire';
}
