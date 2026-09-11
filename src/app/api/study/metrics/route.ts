import { route } from '@/server/http';
import { requireUser } from '@/server/service';
import { readSessionToken } from '@/server/security';
import { studyMetrics } from '@/server/study-metrics';
export const GET=route(async(request,db)=>studyMetrics(db,(await requireUser(db,readSessionToken(request))).id));
export const runtime='nodejs';
