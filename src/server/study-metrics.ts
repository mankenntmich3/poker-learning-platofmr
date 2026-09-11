import type { Database } from './db';
export async function studyMetrics(db:Database,userId:string){
  const [preflop,postflop,positions,boards,mistakes]=await Promise.all([
    db.query<{decisions:number;agreement:string|null}>(`SELECT count(*)::int AS decisions,avg(CASE WHEN (d.feedback->>'chosenFrequency')::numeric>0 THEN 1.0 ELSE 0.0 END) AS agreement FROM nlhe_decisions d JOIN nlhe_questions q ON q.id=d.question_id JOIN nlhe_sessions s ON s.id=q.session_id WHERE d.user_id=$1 AND s.config->>'scenario'<>'flop-srp'`,[userId]),
    db.query<{decisions:number;agreement:string|null;ev_loss:string|null;ev_samples:number}>(`SELECT count(*)::int AS decisions,avg(CASE WHEN (feedback->>'chosenFrequency')::numeric>0 THEN 1.0 ELSE 0.0 END) AS agreement,avg((feedback->>'evLoss')::numeric) AS ev_loss,count(feedback->>'evLoss')::int AS ev_samples FROM study_engine_decisions WHERE user_id=$1`,[userId]),
    db.query<{position:string;decisions:number;agreement:string}>(`SELECT position,count(*)::int AS decisions,avg(CASE WHEN (feedback->>'chosenFrequency')::numeric>0 THEN 1.0 ELSE 0.0 END) AS agreement FROM study_engine_decisions WHERE user_id=$1 GROUP BY position ORDER BY agreement,decisions DESC`,[userId]),
    db.query<{texture:string;decisions:number;agreement:string}>(`SELECT texture,count(*)::int AS decisions,avg(CASE WHEN (feedback->>'chosenFrequency')::numeric>0 THEN 1.0 ELSE 0.0 END) AS agreement FROM study_engine_decisions CROSS JOIN LATERAL jsonb_array_elements_text(board_texture) AS texture WHERE user_id=$1 GROUP BY texture ORDER BY agreement,decisions DESC`,[userId]),
    db.query<{node_id:string;street:string;position:string;chosen_action:string;decisions:number}>(`SELECT node_id,street,position,chosen_action,count(*)::int AS decisions FROM study_engine_decisions WHERE user_id=$1 AND (feedback->>'chosenFrequency')::numeric=0 GROUP BY node_id,street,position,chosen_action ORDER BY decisions DESC LIMIT 8`,[userId]),
  ]);
  return {preflop:preflop[0],postflop:postflop[0],positions,boards,mistakes};
}
