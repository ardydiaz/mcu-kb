import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQdrantAccessFilter} from '../src/services/QdrantService.js';

test('normal-user vector search is restricted by publication and access rules',()=>{const filter=buildQdrantAccessFilter({role_id:3,department:'Information Technology Department'});assert.deepEqual(filter.must,[{key:'status',match:{value:'published'}}]);assert.ok(filter.should.some(item=>item.key==='visibility'&&item.match.value==='public'));assert.ok(filter.should.some(item=>item.must?.some(condition=>condition.key==='allowed_roles'&&condition.match.value===3)));assert.ok(filter.should.some(item=>item.must?.some(condition=>condition.key==='allowed_departments'&&condition.match.value==='Information Technology Department')))});

test('admin vector search still requires published content',()=>{assert.deepEqual(buildQdrantAccessFilter({role_id:1}),{must:[{key:'status',match:{value:'published'}}]})});
