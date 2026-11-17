import test from "node:test";
import assert from "node:assert/strict";
import {canAssign,canManageScope,type V3Scope,type V3Actor} from "../src/lib/v3-permissions";
const branch:V3Scope={organization_id:"a",country_code:"IN",state_id:"gj",branch_id:"office"};
const country:V3Actor={level:"country_admin",scope:{...branch,state_id:null,branch_id:null}};
const state:V3Actor={level:"state_admin",scope:{...branch,branch_id:null}};
test("country admin cannot cross company or country",()=>{assert.equal(canManageScope(country,branch),true);assert.equal(canManageScope(country,{...branch,organization_id:"b"}),false);assert.equal(canManageScope(country,{...branch,country_code:"GB"}),false);});
test("state admin is restricted to their state",()=>{assert.equal(canAssign(state,"employee",branch),true);assert.equal(canAssign(state,"employee",{...branch,state_id:"mh"}),false);assert.equal(canAssign(state,"state_admin",branch),false);assert.equal(canAssign(state,"country_admin",branch),false);});
test("root allocates countries; employees cannot provision",()=>{assert.equal(canAssign({level:"root",scope:null},"country_admin",branch),true);assert.equal(canAssign({level:"employee",scope:branch},"employee",branch),false);});
