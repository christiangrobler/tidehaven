'use strict';
/* The phone has no 3D scene: stand-ins so the shared UI code runs unchanged. */
const GL={ready:false,anim:false,dirty:false,userMoved:false,tkey:''};
const RL={label(){return '';},cycle(){}};
const REDUCED=false,TOP=.2;
const Dice3D={available:false,toss(){return 0;},hide(){},freezeAt(){}};
function initGL(){return false;}
function syncScene(){}
function syncMarkers(){}
function fitCamera(){}
function flashTokens(){}
function lin(c){return c;}
function mix(a){return a;}
function easeOut(t){return 1-Math.pow(1-t,3);}
function tween(ms,fn,done){try{fn(1);}catch(e){}if(done)done();}
