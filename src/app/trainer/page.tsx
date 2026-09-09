import { Trainer } from "@/components/trainer";
export default function TrainerPage() { return <Suspense fallback={<LoadingPanel />}><Trainer /></Suspense>; }
import { Suspense } from 'react';
import { LoadingPanel } from '@/components/ui';
