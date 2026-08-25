import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import SearchSuggestions from './SearchSuggestions';

export default function SearchSuggestionsPortal({target,value,onSelect}){
 const [container,setContainer]=useState(null);
 useEffect(()=>{setContainer(document.querySelector(target))},[target]);
 return container?createPortal(<SearchSuggestions value={value} onSelect={onSelect}/>,container):null;
}
