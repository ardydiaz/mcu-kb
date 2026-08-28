const STOP_WORDS=new Set(['a','an','and','are','can','could','do','does','document','file','find','for','from','give','how','i','in','is','it','me','of','on','please','show','that','the','this','to','what','where','which','who','with','would']);
const GROUPS=[
 ['employee','employees','staff','personnel'],['student','students','learner','learners'],['teacher','teachers','faculty','instructor','instructors'],
 ['use','using','operate','operating','usage'],['rule','rules','guideline','guidelines','policy','policies'],['form','forms','application','request'],
 ['wifi','wi-fi','wireless','internet','network'],['smartboard','smart-board','smart board','interactive-board','interactive board','display','presentation-board','presentation board'],
 ['safety','safe','security'],['manual','handbook','guide'],['department','office','unit'],['admission','admissions','enrollment','enrolment']
];
const PHRASES=new Map([['smart board','interactive-board'],['smart classroom board','interactive-board'],['smart classroom display','interactive-board'],['interactive board','interactive-board'],['wireless network','wifi']]);
const synonymMap=new Map();for(const group of GROUPS)for(const word of group)synonymMap.set(word,group);
const base=value=>String(value||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9-]+/g,' ').replace(/\s+/g,' ').trim();
const normalizePhrases=value=>{let normalized=base(value);for(const [phrase,replacement] of PHRASES)normalized=normalized.replace(new RegExp(`\\b${phrase.replace(/ /g,'\\s+')}\\b`,'g'),replacement);return normalized};
const singular=word=>word.endsWith('ies')&&word.length>4?`${word.slice(0,-3)}y`:word.endsWith('s')&&word.length>3?word.slice(0,-1):word;
const distance=(left,right)=>{if(left===right)return 0;if(Math.abs(left.length-right.length)>1)return 2;const row=Array.from({length:right.length+1},(_,index)=>index);for(let i=1;i<=left.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=right.length;j++){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(left[i-1]===right[j-1]?0:1));previous=saved}}return row[right.length]};

export function analyzeSearch(value){
 let normalized=normalizePhrases(value);
 const raw=normalized.split(' ').filter(word=>word.length>1&&!STOP_WORDS.has(word));const concepts=[];
 for(const token of raw){const word=singular(token),variants=synonymMap.get(word)||synonymMap.get(token)||[word];const normalizedVariants=[...new Set(variants.flatMap(item=>[base(item),singular(base(item))]).filter(Boolean))];if(!concepts.some(concept=>concept[0]===normalizedVariants[0]))concepts.push(normalizedVariants)}
 return{original:base(value),normalized:raw.map(singular).join(' '),concepts:concepts.slice(0,12),expanded:[...new Set(concepts.flat())]};
}

export function scoreSearchText(value,analysis,{phraseWeight=70,coverageWeight=60}={}){
 const text=normalizePhrases(value),tokens=[...new Set([...text.split(' '),...base(value).split(' ')].filter(Boolean))];if(!text||!analysis.concepts.length)return{score:0,coverage:0,matched:0};let matched=0;
 for(const variants of analysis.concepts){const found=variants.some(variant=>text.includes(variant)||tokens.some(token=>variant.length>=5&&token.length>=5&&distance(token,variant)<=1));if(found)matched++}
 const coverage=matched/analysis.concepts.length;const phrase=analysis.normalized.length>=4&&text.includes(analysis.normalized);return{score:coverage*coverageWeight+(phrase?phraseWeight:0),coverage,matched};
}

export const isRelevant=result=>result.coverage>=.5&&result.score>=30;
