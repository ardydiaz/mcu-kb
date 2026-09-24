import {useEffect} from 'react';
import ScrollReveal from 'scrollreveal';

const defaults={distance:'40px',origin:'bottom',duration:800,easing:'cubic-bezier(.5,0,0,1)',interval:90,reset:false};

export default function useScrollReveal(selector,options={},deps=[]){
 useEffect(()=>{
  if(!selector||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const sr=ScrollReveal();
  sr.reveal(selector,{...defaults,...options});
  return ()=>sr.destroy();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[selector,...deps]);
}
