/** Original procedural score and foley. No audio downloads or third-party SDKs. */
export class Soundscape{
 constructor(settings){this.settings=settings;this.ctx=null;this.timer=null;this.step=0;this.lastRail=0;}
 async unlock(){
  try{
   if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.48;this.master.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.effectsBus=this.ctx.createGain();this.musicBus.connect(this.master);this.effectsBus.connect(this.master);this.musicBus.gain.value=this.settings.music?1:0;this.effectsBus.gain.value=this.settings.sound?1:0;}
   if(this.ctx.state==='suspended')await this.ctx.resume();
   this.startMusic();
  }catch{/* Audio is an enhancement; unsupported devices remain playable. */}
 }
 tone(freq,duration=.2,gain=.13,type='sine',delay=0,channel='effects'){
  if(!this.ctx||this.ctx.state!=='running')return;
  const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g);g.connect(channel==='music'?this.musicBus:this.effectsBus);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 effect(type){
  if(!this.settings.sound)return;
  if(type==='rail'){const now=performance.now();if(now-this.lastRail<55)return;this.lastRail=now;this.tone(440,.075,.12,'triangle');this.tone(880,.08,.035,'sine',.01);}
  if(type==='tap')this.tone(520,.10,.07,'sine');
  if(type==='undo')this.tone(330,.12,.06,'triangle');
  if(type==='mail'){[659.25,880,1046.5].forEach((n,i)=>this.tone(n,.35,.10,'sine',i*.07));}
  if(type==='unlock'){this.tone(660,.15,.065,'triangle');this.tone(990,.25,.05,'sine',.08);}
  if(type==='bridge')this.tone(150,.08,.025,'triangle');
  if(type==='go'){this.tone(784,.34,.08,'sine');this.tone(1046.5,.4,.045,'sine',.04);}
  if(type==='success'){[523.25,659.25,783.99,1046.5].forEach((n,i)=>this.tone(n,.7,.11,'triangle',i*.13));}
  if(type==='error'){this.tone(293.66,.25,.065,'sine');this.tone(261.63,.3,.055,'sine',.12);}
 }
 startMusic(){
  if(this.timer||!this.settings.music||!this.ctx||this.ctx.state!=='running'||document.hidden)return;
  const melody=[0,64,67,0,72,0,67,64,0,62,65,0,69,0,65,62,0,60,64,0,67,0,64,60,0,62,67,0,71,0,67,62];
  const beat=()=>{
   if(!this.settings.music||document.hidden)return;
   const note=melody[this.step%melody.length];if(note)this.tone(440*2**((note-69)/12),1.7,.023,'sine',0,'music');
   if(this.step%8===0){const bass=[48,50,45,43][Math.floor(this.step/8)%4];this.tone(440*2**((bass-69)/12),3.7,.025,'sine',0,'music');}
   this.step++;
  };
  beat();this.timer=setInterval(beat,550);
 }
 stopMusic(){if(this.timer)clearInterval(this.timer);this.timer=null;}
 update(settings){
  this.settings=settings;
  // Mute already-playing notes too; unrelated settings must not restart the score.
  if(this.ctx)for(const [bus,enabled] of [[this.musicBus,settings.music],[this.effectsBus,settings.sound]]){
   if(!bus)continue;const t=this.ctx.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setTargetAtTime(enabled?1:0,t,.015);
  }
  if(settings.music)this.startMusic();else this.stopMusic();
 }
 pause(){this.stopMusic();this.ctx?.suspend().catch(()=>{});}
 dispose(){this.stopMusic();this.ctx?.close().catch(()=>{});}
}
