import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSearch,isRelevant,scoreSearchText} from '../src/utils/searchRelevance.js';

test('removes conversational filler words',()=>{const result=analyzeSearch('What are the Interactive Board Use Policy?');assert.equal(result.normalized,'interactive-board use policy')});

test('maps natural synonyms to document terminology',()=>{const query=analyzeSearch('How should teachers operate the smart classroom board?');const score=scoreSearchText('Interactive Board Use Policy for Faculty',query);assert.ok(score.coverage>=.75);assert.ok(isRelevant(score))});

test('tolerates small spelling mistakes',()=>{const query=analyzeSearch('interative bord use polcy');const correct=scoreSearchText('Interactive Board Use Policy',query,{coverageWeight:70});const unrelated=scoreSearchText('Internet Access and Use Policy',query,{coverageWeight:70});assert.ok(correct.score>unrelated.score);assert.ok(correct.coverage>=.75)});

test('rejects unrelated content',()=>{const query=analyzeSearch('spaceship catering schedule');const score=scoreSearchText('Interactive Board Use Policy',query);assert.equal(isRelevant(score),false)});
