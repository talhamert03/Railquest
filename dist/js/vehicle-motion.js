/** Presentation only: motion never changes cells, timings or collision rules. */
export function vehiclePose({time=0,distance=0,moving=false,selected=false,engine=false,reducedMotion=false}={}){
 if(reducedMotion)return {lift:0,tilt:0,scaleY:1};
 const roll=distance*Math.PI*4;
 if(moving)return {lift:.018+Math.sin(roll)*.016,tilt:Math.sin(roll*.5)*.023,scaleY:1+Math.sin(roll+.8)*.01};
 const breath=Math.sin(time*(engine?2.1:2.5));
 return {lift:selected?(1+breath)*.018:0,tilt:engine?breath*.006:selected?breath*.009:0,scaleY:1};
}
export function easeConvoy(current,target,dt,reducedMotion=false){
 if(reducedMotion)return target;
 const value=current+(target-current)*(1-Math.exp(-Math.max(0,dt)*12));
 return Math.abs(value-target)<.001?target:value;
}
