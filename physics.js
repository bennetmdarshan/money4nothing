import * as C from './vendor/cannon-es.js';
export {C};
export class DamageManager {
 constructor(onChange,onFail){this.pay=2500;this.total=2500;this.last=new Map();this.onChange=onChange;this.onFail=onFail;}
 hit(amount,label,key,time){if(time-(this.last.get(key)??-100)<1.2)return;this.last.set(key,time);this.pay=Math.max(0,this.pay-amount);this.onChange(this.pay,label,amount);if(!this.pay)this.onFail('Your paycheck is gone.');}
}
export class PlayerController {
 constructor(world,position){this.world=world;this.body=new C.Body({material:new C.Material({friction:0,restitution:0}),mass:75,shape:new C.Sphere(.36),position:new C.Vec3(...position),fixedRotation:true,linearDamping:.65});this.body.updateMassProperties();world.addBody(this.body);this.yaw=0;this.grounded=false;this.hands=[0,1].map(()=>{let b=new C.Body({type:C.Body.KINEMATIC,collisionFilterGroup:0,collisionFilterMask:0});world.addBody(b);return b;});this.body.addEventListener('collide',e=>{let n=e.contact.ni.y*(e.contact.bi===this.body?-1:1);if(n>.4)this.grounded=true;});}
 move(x,z,dt,heavy,slippery){if(x||z)this.body.wakeUp();let len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}let speed=heavy?1.6:3.6;let gain=slippery?2:12;this.body.velocity.x+=(x*speed-this.body.velocity.x)*Math.min(1,dt*gain);this.body.velocity.z+=(z*speed-this.body.velocity.z)*Math.min(1,dt*gain);if(len>.12&&!heavy)this.yaw=Math.atan2(x,z);}
 jump(){if(this.grounded){this.body.velocity.y=3.7;this.grounded=false;}}
 updateHands(yaw,height,distance,dt){for(let i=0;i<2;i++){let side=(i===0?-.34:.34),p=this.body.position;let t=new C.Vec3(p.x+Math.sin(yaw)*distance+Math.cos(yaw)*side,p.y+height,p.z+Math.cos(yaw)*distance-Math.sin(yaw)*side);t.vsub(this.hands[i].position,this.hands[i].velocity);this.hands[i].velocity.scale(1/Math.max(dt,.001),this.hands[i].velocity);}}
}
export class GrabTiltController {
 constructor(world,player,onToast){this.world=world;this.player=player;this.onToast=onToast;this.target=null;this.joints=[null,null];this.yaw=0;this.tilt=0;this.dolly=null;this.hinge=null;this.grips=[false,false];}
 setHands(wanted,appliances){this.grips=wanted;if(!wanted.some(Boolean)){this.release();return;}if(!this.target){let p=this.player.body.position;let a=appliances.filter(a=>!a.delivered).sort((a,b)=>a.body.position.distanceTo(p)-b.body.position.distanceTo(p))[0];if(!a||Math.hypot(a.body.position.x-p.x,a.body.position.z-p.z)>2.35){this.onToast('Move closer to an appliance, then grab.');return;}if(a.type==='fridge'&&!wanted.every(Boolean)){this.onToast('The fridge needs both hands on the dolly.');return;}this.target=a;this.yaw=this.player.yaw=Math.atan2(a.body.position.x-p.x,a.body.position.z-p.z);this.tilt=0;a.dropHeight=null;
 if(a.type==='fridge'){this.dolly=new C.Body({mass:12,shape:new C.Box(new C.Vec3(.7,.12,.6)),position:new C.Vec3(a.body.position.x,a.body.position.y-a.size[1]/2-.02,a.body.position.z),linearDamping:.08});this.dolly.quaternion.copy(a.body.quaternion);this.world.addBody(this.dolly);this.hinge=new C.HingeConstraint(this.dolly,a.body,{pivotA:new C.Vec3(0,.12,0),pivotB:new C.Vec3(0,-a.size[1]/2,0),axisA:new C.Vec3(1,0,0),axisB:new C.Vec3(1,0,0),collideConnected:false,maxForce:1800});this.world.addConstraint(this.hinge);this.onToast('Dolly engaged. ↑ tilt back; ↓ correct. Keep below 45°.');}else this.onToast(a.type==='tv'?'Wide load. ↑ / ↓ tilts it through doorways.':'Fragile glass. Set it down gently.');
 this.player.hands.forEach((h,i)=>{h.position.copy(a.body.position);h.position.x+=(i?1:-1)*.34;});
 }
 for(let i=0;i<2;i++){if(wanted[i]&&!this.joints[i]){let body=this.dolly||this.target.body;let pivot=new C.Vec3((i?1:-1)*Math.min(.34,this.target.size[0]/3),this.dolly?.15:0,0);this.joints[i]=new C.PointToPointConstraint(this.player.hands[i],new C.Vec3(),body,pivot,this.dolly?1000:600);this.joints[i].collideConnected=false;this.world.addConstraint(this.joints[i]);}else if(!wanted[i]&&this.joints[i]){this.world.removeConstraint(this.joints[i]);this.joints[i]=null;}}
 }
 update(dt,rotate,tilt){if(!this.target)return;this.yaw+=rotate*dt*1.6;this.tilt=Math.max(-1.05,Math.min(1.05,this.tilt+tilt*dt*.65));this.player.yaw=this.yaw;let a=this.target,b=a.body;let heavy=a.type==='fridge';this.player.updateHands(this.yaw,heavy?-.08:.75,heavy?1.4:1.05,dt);
 // A torque servo steers the jointed rigid body; collisions remain authoritative.
 let desired=new C.Quaternion();desired.setFromEuler(heavy?this.tilt:0,this.yaw,a.type==='tv'?this.tilt:0,'YXZ');let inv=b.quaternion.conjugate(),error=desired.mult(inv);if(error.w<0){error.x*=-1;error.y*=-1;error.z*=-1;}let power=heavy?210:45,damping=heavy?48:8;for(let k of ['x','y','z'])b.torque[k]+=error[k]*power-b.angularVelocity[k]*damping;
 if(this.dolly){let euler=new C.Vec3();this.dolly.quaternion.toEuler(euler);this.dolly.torque.y+=Math.sin(this.yaw-euler.y)*80-this.dolly.angularVelocity.y*15;}
 }
 release(){if(this.target){this.target.dropHeight=this.target.body.position.y;this.target.wasHeld=true;}for(let i=0;i<2;i++){if(this.joints[i])this.world.removeConstraint(this.joints[i]);this.joints[i]=null;}if(this.hinge)this.world.removeConstraint(this.hinge);if(this.dolly)this.world.removeBody(this.dolly);this.target=null;this.hinge=null;this.dolly=null;this.grips=[false,false];this.tilt=0;}
}
