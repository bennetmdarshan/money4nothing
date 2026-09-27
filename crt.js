import * as T from './vendor/three.module.min.js';
export class CRTDisplay{
 constructor(renderer){this.renderer=renderer;this.target=new T.WebGLRenderTarget(960,640,{minFilter:T.LinearFilter,magFilter:T.LinearFilter});this.uniforms={image:{value:this.target.texture},time:{value:0},damage:{value:0},resolution:{value:new T.Vector2(960,640)}};this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:this.uniforms,vertexShader:'varying vec2 uv0; void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp float;
 uniform sampler2D image;uniform float time,damage;uniform vec2 resolution;varying vec2 uv0;
 float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec2 p=uv0*2.-1.;vec2 uv=(p*(1.+.025*dot(p,p)))*.5+.5;
 float band=step(.92,sin(uv.y*32.+time*14.))*damage;uv.x+=band*.025*sin(time*94.);
 float shift=.0013+damage*.003;vec3 c=vec3(texture2D(image,uv+vec2(shift,0)).r,texture2D(image,uv).g,texture2D(image,uv-vec2(shift,0)).b);
 c*=.93+.07*sin(uv.y*resolution.y*3.14159);c+=vec3(random(uv+time)-.5)*(.018+band*.3);
 c*=1.-.19*pow(length(p),2.);if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)c=vec3(.012,.019,.02);
 gl_FragColor=vec4(c,1.);}` })));}
 resize(w,h){this.target.setSize(Math.min(w,1280),Math.min(h,850));this.uniforms.resolution.value.set(w,h);}
 render(scene,camera,time,damage){this.uniforms.time.value=time;this.uniforms.damage.value=damage;this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);}
}
