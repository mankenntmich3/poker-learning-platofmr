import { Postflop } from '@/components/postflop';
import { Suspense } from 'react';
import { LoadingPanel } from '@/components/ui';
export default function Page() { return <Suspense fallback={<LoadingPanel/>}><Postflop /></Suspense>; }
