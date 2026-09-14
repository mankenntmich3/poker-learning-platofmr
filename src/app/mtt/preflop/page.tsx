import { VerifiedPreflopStudy } from '@/components/verified-river-study';
import { parseVerifiedSpot } from '@/shared/verified-spot';
import Link from 'next/link';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  let spot;
  try{
    if(Object.keys(params).some(k=>!['kind','stack','ante'].includes(k)) || params.kind!==undefined&&params.kind!=='preflop')throw new Error('Invalid context');
    if(Array.isArray(params.stack)||Array.isArray(params.ante))throw new Error('Invalid context');
    spot=parseVerifiedSpot(new URLSearchParams({kind:'preflop',stack:params.stack??'15',ante:params.ante??'1'}));
  }catch{spot=null;}
  if(!spot)return <section className="panel"><h1>VERIFIED SOLUTION UNAVAILABLE</h1><p>Für diesen exakten Kontext ist keine geprüfte Lösung verfügbar.</p><Link href="/mtt">Tournament-Konfiguration</Link></section>;
  return <VerifiedPreflopStudy key={JSON.stringify(spot)} spot={spot}/>;
}
