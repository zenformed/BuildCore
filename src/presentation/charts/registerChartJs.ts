import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  ArcElement,
  BarElement,
  BarController,
} from 'chart.js';

let registered = false;

/** Register Chart.js scales/elements once for react-chartjs-2. */
export function ensureChartJsRegistered(): void {
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    BarController,
    ArcElement,
    Tooltip,
    Legend,
    Filler
  );
  registered = true;
}
