export type V3Level="root"|"country_admin"|"state_admin"|"employee";
export type V3Scope={organization_id:string;country_code:string;state_id:string|null;branch_id:string|null};
export type V3Membership=V3Scope&{user_id:string;level:Exclude<V3Level,"root">};
export type V3Actor={level:V3Level;scope:V3Scope|null};
export function canManageScope(actor:V3Actor,target:V3Scope):boolean {
 if(actor.level==="root")return true;
 const s=actor.scope;
 if(!s||s.organization_id!==target.organization_id||s.country_code!==target.country_code)return false;
 return actor.level==="country_admin"||(actor.level==="state_admin"&&s.state_id!==null&&s.state_id===target.state_id);
}
export function canAssign(actor:V3Actor,level:V3Membership["level"],target:V3Scope):boolean {
 if(!canManageScope(actor,target))return false;
 if(actor.level==="root")return level==="country_admin";
 if(actor.level==="country_admin")return level==="state_admin"||level==="employee";
 return actor.level==="state_admin"&&level==="employee";
}
