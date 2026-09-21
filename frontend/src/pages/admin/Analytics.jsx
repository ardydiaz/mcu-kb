import {Clock3,MessageSquareText,Percent,ThumbsDown,ThumbsUp} from 'lucide-react';
import {useEffect,useState} from 'react';
import {getAnswerFeedback} from '../../services/adminApi';

const dateDetails=value=>{const date=new Date(value);if(!value||Number.isNaN(date.getTime()))return{full:'Date unavailable',relative:'Recently'};const seconds=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));let relative='Just now';if(seconds>=86400)relative=`${Math.floor(seconds/86400)}d ago`;else if(seconds>=3600)relative=`${Math.floor(seconds/3600)}h ago`;else if(seconds>=60)relative=`${Math.floor(seconds/60)}m ago`;return{full:date.toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}),relative}};

export default function Analytics(){
 const [data,setData]=useState({up:0,down:0,total:0,recent:[]});const [loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;getAnswerFeedback().then(({data})=>active&&setData(data.data)).catch(error=>active&&setError(error.response?.data?.message||'Unable to load answer feedback.')).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
 const helpfulRate=data.total?Math.round((data.up/data.total)*100):0;
 return <div className="admin-page">
  <div className="page-heading"><div><h1>Analytics</h1><p>Understand searches, visits, and engagement.</p></div></div>
  <div className="stats">{[[ThumbsUp,'Thumbs up',data.up],[ThumbsDown,'Thumbs down',data.down],[MessageSquareText,'Total feedback',data.total],[Percent,'Helpful rate',`${helpfulRate}%`]].map(([Icon,label,value])=><article key={label}><span><Icon/></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>
  <section className="recent-activity-panel"><header><div><span className="activity-heading-icon"><Clock3/></span><div><small>KNOWLEDGE ANSWERS</small><h2>Recent answer feedback</h2><p>Thumbs up / down votes from users on AI-generated knowledge answers.</p></div></div></header>
   {error?<div className="activity-state error-state"><strong>Feedback unavailable</strong><p>{error}</p></div>:loading?<div className="activity-skeleton">{[1,2,3,4].map(item=><i key={item}/>)}</div>:data.recent?.length?<div className="activity-list">{data.recent.map((item,index)=>{const time=dateDetails(item.updated_at||item.created_at);return <div className="activity-row" key={index}><span className={`activity-file-icon feedback-icon-${item.vote}`}>{item.vote==='up'?<ThumbsUp/>:<ThumbsDown/>}</span><div className="activity-document"><div><span>{item.vote==='up'?'HELPFUL':'NOT HELPFUL'}</span></div><strong>{item.query_text}</strong><small>{item.fullname||'Unknown user'}</small></div><time dateTime={item.updated_at||item.created_at||undefined} title={time.full}><strong>{time.relative}</strong><small>{time.full}</small></time></div>})}</div>:<div className="activity-state"><MessageSquareText/><strong>No feedback recorded yet</strong><p>Votes on the knowledge search page will appear here.</p></div>}
  </section>
 </div>;
}
