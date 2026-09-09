import { RangeExplorer } from "@/components/range-explorer";
export default function RangesPage() { return <Suspense fallback={<LoadingPanel />}><RangeExplorer /></Suspense>; }
import { Suspense } from 'react';
import { LoadingPanel } from '@/components/ui';
