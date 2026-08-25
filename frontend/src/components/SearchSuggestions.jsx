import {FolderTree,LoaderCircle,Tag} from 'lucide-react';
import {useEffect,useState} from 'react';
import {getSearchSuggestions} from '../services/adminApi';

export default function SearchSuggestions({value,onSelect}){
 const [items,setItems]=useState([]);
 const [loading,setLoading]=useState(false);

 useEffect(()=>{const query=value.trim();let active=true;if(query.length<2){setItems([]);setLoading(false);return()=>{active=false}}const timer=setTimeout(()=>{setLoading(true);getSearchSuggestions(query).then(({data})=>{if(active)setItems(data.data||[])}).catch(()=>{if(active)setItems([])}).finally(()=>{if(active)setLoading(false)})},250);return()=>{active=false;clearTimeout(timer)}},[value]);
 if(!loading&&!items.length)return null;
 return <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
  {loading?<div className="suggestion-loading"><LoaderCircle/> Finding suggestions…</div>:items.map(item=><button type="button" role="option" key={`${item.type}-${item.value}`} onMouseDown={event=>event.preventDefault()} onClick={()=>{onSelect(item.value);setItems([])}}><span>{item.type==='section'?<FolderTree/>:<Tag/>}</span><div><strong>{item.value}</strong><small>{item.type==='section'?'Knowledge section':'Search tag'}</small></div>{item.count>1&&<b>{item.count}</b>}</button>)}
 </div>;
}
