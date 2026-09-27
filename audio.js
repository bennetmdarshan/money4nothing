export class RetroAudio{
 constructor(){this.enabled=false;this.ctx=null;this.step=0;this.timer=null;}
 toggle(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume();this.enabled=!this.enabled;if(this.enabled){this.timer=setInterval(()=>this.beat(),150);}else clearInterval(this.timer);return this.enabled;}
 tone(freq,duration=.12,type='square',vol=.045,slide=0){if(!this.enabled)return;let c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),c.currentTime+duration);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration);}
 noise(){if(!this.enabled)return;let c=this.ctx,b=c.createBuffer(1,c.sampleRate*.1,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);let s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='highpass';f.frequency.value=1700;g.gain.value=.035;s.connect(f).connect(g).connect(c.destination);s.start();}
 beat(){let i=this.step++%32;this.tone([65.4,65.4,77.8,58.3][Math.floor(i/8)],.13,'sawtooth',.022);if(i%4===0)this.tone(140,.15,'sine',.08,35);if(i%8===4)this.noise();if(i%2===0)this.tone(4000,.03,'square',.006);if([0,3,6,10,14].includes(i%16)){let f=[130.8,155.6,116.5,174.6][Math.floor(i/8)];this.tone(f,.2,'sawtooth',.022);this.tone(f*1.5,.2,'sawtooth',.018);}}
 cash(){this.tone(1500,.13,'square',.045);setTimeout(()=>this.tone(2200,.25,'sine',.05),80);}
 clunk(){this.tone(100,.2,'triangle',.09,30);}
 shout(){this.tone(180,.17,'sawtooth',.04,80);if(this.enabled&&'speechSynthesis'in window){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance('We gotta move these!');u.pitch=.5;u.rate=1.15;u.volume=.5;speechSynthesis.speak(u);}}
}
