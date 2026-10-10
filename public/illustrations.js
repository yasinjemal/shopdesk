(function(root){
  'use strict';
  // Original flat illustrations drawn with canvas paths, so every offer can
  // look finished before a photo exists. They are rendered in the design's own
  // colours and never stand in for a specific brand's packaging.
  const palette={paper:'#fff7ea',cream:'#f7efe0',red:'#d9472b',orange:'#f08a24',yellow:'#f6c445',green:'#4f9d4a',leaf:'#2f7a3b',blue:'#2f6fb5',teal:'#2a8c8a',brown:'#8a5a3c',kraft:'#c9a272',dark:'#2d3338',grey:'#9aa3ab',pink:'#e58fb5',purple:'#7a5cb3',skin:'#f0c9a8',white:'#ffffff'};
  const cache=new Map();
  function rr(g,x,y,w,h,r,fill,stroke){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=3;g.stroke();}}
  function ellipse(g,x,y,rx,ry,fill,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.fillStyle=fill;g.fill();}
  function label(g,x,y,w,h,fill){rr(g,x,y,w,h,h/4,fill);g.fillStyle='#ffffff55';g.fillRect(x+w*.15,y+h*.35,w*.7,h*.14);g.fillRect(x+w*.25,y+h*.6,w*.5,h*.12);}
  function shine(g,x,y,w,h){g.fillStyle='#ffffff55';g.beginPath();g.roundRect(x,y,w,h,w/2);g.fill();}
  const draw={
    sack(g,c){rr(g,22,20,56,68,10,c.a);g.fillStyle=c.b;g.fillRect(22,34,56,8);label(g,32,48,36,22,palette.white);ellipse(g,50,20,24,6,c.a);},
    bag(g,c){rr(g,26,24,48,62,8,c.a);rr(g,30,16,40,10,4,c.b);label(g,34,44,32,20,palette.white);},
    pouch(g,c){g.beginPath();g.moveTo(24,22);g.lineTo(76,22);g.lineTo(72,86);g.lineTo(28,86);g.closePath();g.fillStyle=c.a;g.fill();g.fillStyle=c.b;g.fillRect(24,22,52,8);label(g,36,44,28,20,palette.white);},
    box(g,c){rr(g,22,24,56,56,4,c.a);g.fillStyle=c.b;g.fillRect(22,24,56,14);label(g,34,46,32,22,palette.white);},
    carton(g,c){g.beginPath();g.moveTo(30,36);g.lineTo(50,22);g.lineTo(70,36);g.lineTo(70,86);g.lineTo(30,86);g.closePath();g.fillStyle=palette.white;g.fill();g.strokeStyle=c.a;g.lineWidth=3;g.stroke();g.fillStyle=c.a;g.fillRect(30,46,40,16);g.fillStyle=c.b;g.beginPath();g.moveTo(30,36);g.lineTo(50,22);g.lineTo(70,36);g.closePath();g.fill();},
    bottle(g,c){rr(g,43,12,14,14,3,c.b);rr(g,36,24,28,64,8,c.a);label(g,40,44,20,22,palette.white);shine(g,40,30,4,30);},
    jar(g,c){rr(g,32,18,36,12,3,c.b);rr(g,28,28,44,58,10,c.a);label(g,36,44,28,24,palette.white);shine(g,33,36,4,30);},
    can(g,c){rr(g,30,22,40,60,6,c.a);ellipse(g,50,22,20,6,c.b);ellipse(g,50,82,20,6,c.b);label(g,36,40,28,22,palette.white);},
    tub(g,c){rr(g,26,30,48,50,8,c.a);rr(g,24,24,52,12,4,c.b);label(g,34,46,32,18,palette.white);},
    cup(g,c){g.beginPath();g.moveTo(30,30);g.lineTo(70,30);g.lineTo(64,86);g.lineTo(36,86);g.closePath();g.fillStyle=c.a;g.fill();ellipse(g,50,30,20,6,c.b);g.fillStyle=palette.white;g.fillRect(36,48,28,14);},
    spray(g,c){rr(g,34,40,28,48,8,c.a);rr(g,40,22,16,20,4,c.b);g.beginPath();g.moveTo(56,24);g.lineTo(74,24);g.lineTo(70,34);g.lineTo(56,34);g.closePath();g.fillStyle=c.b;g.fill();label(g,38,54,20,22,palette.white);},
    tube(g,c){rr(g,42,12,16,10,3,c.b);g.beginPath();g.moveTo(36,22);g.lineTo(64,22);g.lineTo(70,84);g.lineTo(30,84);g.closePath();g.fillStyle=c.a;g.fill();label(g,40,40,20,22,palette.white);},
    lotion(g,c){rr(g,44,10,12,14,3,c.b);rr(g,34,22,32,66,14,c.a);label(g,40,46,20,22,palette.white);shine(g,38,28,4,34);},
    soap(g,c){rr(g,22,32,56,36,14,c.a);ellipse(g,50,50,18,10,'#ffffff44');g.fillStyle='#ffffff';g.beginPath();g.arc(30,28,6,0,7);g.arc(40,20,5,0,7);g.arc(62,24,7,0,7);g.fill();},
    roll(g,c){rr(g,26,26,48,52,8,palette.white);ellipse(g,50,26,24,10,c.b);ellipse(g,50,26,10,4,c.a);g.fillStyle=palette.white;g.fillRect(26,74,48,8);g.fillStyle=c.a;g.fillRect(26,70,48,3);},
    jerrycan(g,c){rr(g,24,24,52,62,8,c.a);rr(g,56,14,12,14,3,c.b);g.strokeStyle='#00000022';g.lineWidth=3;g.strokeRect(32,40,36,30);label(g,34,46,32,18,palette.white);},
    gascylinder(g,c){rr(g,32,26,36,60,16,c.a);rr(g,40,14,20,14,4,c.b);g.fillStyle='#00000022';g.fillRect(32,40,36,4);g.fillRect(32,70,36,4);},
    candle(g,c){rr(g,40,30,20,56,4,palette.cream);ellipse(g,50,24,6,10,c.b);ellipse(g,50,26,3,6,palette.yellow);g.fillStyle=c.a;g.fillRect(36,80,28,8);},
    broom(g,c){g.fillStyle=palette.kraft;g.fillRect(47,10,6,44);g.beginPath();g.moveTo(34,52);g.lineTo(66,52);g.lineTo(76,88);g.lineTo(24,88);g.closePath();g.fillStyle=c.a;g.fill();g.fillStyle=c.b;g.fillRect(34,52,32,8);},
    sponge(g,c){rr(g,24,36,52,32,8,c.a);g.fillStyle=c.b;g.fillRect(24,36,52,10);g.fillStyle='#00000022';for(const [x,y] of [[36,56],[50,60],[62,54]])g.fillRect(x,y,4,4);},
    battery(g,c){rr(g,34,22,32,62,6,c.a);rr(g,44,16,12,8,2,c.b);g.fillStyle=c.b;g.fillRect(34,40,32,22);g.fillStyle=palette.white;g.fillRect(46,46,8,3);g.fillRect(48,44,4,7);},
    bulb(g,c){ellipse(g,50,42,22,24,c.b);rr(g,40,62,20,16,4,c.a);g.fillStyle=palette.white;g.fillRect(44,78,12,6);shine(g,38,30,5,16);},
    bread(g,c){rr(g,22,40,56,40,10,c.a);ellipse(g,36,40,14,14,c.a);ellipse(g,58,38,16,16,c.a);g.fillStyle=c.b;g.fillRect(22,70,56,10);},
    roll(g,c){rr(g,26,26,48,52,8,palette.white);ellipse(g,50,26,24,10,c.b);ellipse(g,50,26,10,4,c.a);g.fillStyle=c.a;g.fillRect(26,70,48,3);},
    pastry(g,c){ellipse(g,50,54,28,20,c.a);ellipse(g,50,42,24,14,c.b);g.fillStyle=palette.white;for(const [x,y] of [[40,40],[54,38],[48,48]])ellipse(g,x,y,2,2,palette.white);},
    cake(g,c){rr(g,22,48,56,34,6,c.a);rr(g,22,42,56,12,6,c.b);g.fillStyle=palette.white;for(let x=28;x<76;x+=10)ellipse(g,x,54,4,4,palette.white);rr(g,47,24,6,18,2,palette.red);},
    pie(g,c){rr(g,22,48,56,28,8,c.a);ellipse(g,50,48,28,10,c.b);g.strokeStyle='#00000022';g.lineWidth=3;g.beginPath();g.moveTo(30,52);g.lineTo(70,52);g.stroke();},
    meat(g,c){g.beginPath();g.moveTo(26,40);g.bezierCurveTo(20,20,60,14,74,30);g.bezierCurveTo(86,46,70,80,46,82);g.bezierCurveTo(26,84,14,60,26,40);g.fillStyle=c.a;g.fill();ellipse(g,40,50,10,8,palette.white);g.fillStyle='#ffffff88';g.fillRect(52,34,6,30);},
    sausage(g,c){g.lineCap='round';g.strokeStyle=c.a;g.lineWidth=16;g.beginPath();g.moveTo(26,60);g.bezierCurveTo(26,28,74,28,74,60);g.stroke();g.strokeStyle='#00000022';g.lineWidth=3;g.beginPath();g.moveTo(42,38);g.lineTo(44,48);g.moveTo(58,38);g.lineTo(56,48);g.stroke();},
    chicken(g,c){ellipse(g,46,50,26,20,c.a);ellipse(g,70,36,8,12,c.a,.6);g.fillStyle=palette.white;g.beginPath();g.moveTo(72,30);g.lineTo(86,20);g.lineTo(82,34);g.closePath();g.fill();ellipse(g,36,52,10,7,'#ffffff55');},
    fish(g,c){ellipse(g,46,52,28,16,c.a);g.beginPath();g.moveTo(72,52);g.lineTo(88,38);g.lineTo(88,66);g.closePath();g.fillStyle=c.b;g.fill();ellipse(g,30,48,3,3,palette.dark);ellipse(g,46,52,10,6,'#ffffff44');},
    egg(g,c){ellipse(g,38,56,14,18,palette.cream);ellipse(g,60,52,14,18,palette.white);rr(g,20,70,60,14,4,c.a);},
    cheese(g,c){g.beginPath();g.moveTo(22,74);g.lineTo(78,74);g.lineTo(78,52);g.lineTo(22,32);g.closePath();g.fillStyle=palette.yellow;g.fill();g.fillStyle=c.a;g.fillRect(22,74,56,8);ellipse(g,56,60,5,5,'#00000022');ellipse(g,42,62,3,3,'#00000022');},
    icecream(g,c){g.beginPath();g.moveTo(34,50);g.lineTo(66,50);g.lineTo(50,88);g.closePath();g.fillStyle=palette.kraft;g.fill();ellipse(g,50,44,20,18,c.a);ellipse(g,42,30,12,12,c.b);},
    fries(g,c){g.fillStyle=palette.yellow;for(const [x,y] of [[36,22],[46,16],[56,20],[64,28]])rr(g,x,y,8,40,2,palette.yellow);rr(g,28,46,44,40,6,c.a);g.fillStyle=c.b;g.fillRect(28,46,44,8);},
    softdrink(g,c){rr(g,40,10,20,10,3,c.b);rr(g,34,20,32,68,10,c.a);label(g,40,44,20,22,palette.white);shine(g,38,26,4,40);},
    juice(g,c){g.beginPath();g.moveTo(32,34);g.lineTo(50,22);g.lineTo(68,34);g.lineTo(68,86);g.lineTo(32,86);g.closePath();g.fillStyle=c.a;g.fill();ellipse(g,50,58,12,12,palette.orange);g.fillStyle=palette.leaf;g.beginPath();g.ellipse(58,46,6,3,-.7,0,7);g.fill();},
    water(g,c){rr(g,42,10,16,10,3,c.b);rr(g,36,20,28,68,12,'#dff1ff');g.strokeStyle=c.a;g.lineWidth=3;g.strokeRect(38,22,24,64);label(g,41,46,18,18,c.a);},
    sweets(g,c){ellipse(g,50,52,16,16,c.a);g.fillStyle=c.b;for(const s of [-1,1]){g.beginPath();g.moveTo(50+s*14,52);g.lineTo(50+s*30,40);g.lineTo(50+s*30,64);g.closePath();g.fill();}ellipse(g,46,46,4,4,'#ffffff77');},
    chocolate(g,c){rr(g,24,30,52,44,4,palette.brown);g.strokeStyle='#00000033';g.lineWidth=2;for(let x=37;x<76;x+=13){g.beginPath();g.moveTo(x,30);g.lineTo(x,74);g.stroke();}g.beginPath();g.moveTo(24,52);g.lineTo(76,52);g.stroke();g.fillStyle=c.a;g.fillRect(24,30,20,44);},
    potato(g,c){ellipse(g,50,54,26,18,palette.kraft,-.3);ellipse(g,40,48,3,2,'#00000033');ellipse(g,58,58,3,2,'#00000033');ellipse(g,52,46,3,2,'#00000033');},
    onion(g,c){ellipse(g,50,56,22,24,c.a);g.fillStyle=palette.leaf;g.fillRect(47,20,6,18);g.strokeStyle='#00000022';g.lineWidth=2;g.beginPath();g.moveTo(42,36);g.bezierCurveTo(34,52,34,66,42,78);g.stroke();},
    tomato(g,c){ellipse(g,50,56,26,24,palette.red);g.fillStyle=palette.leaf;g.beginPath();g.moveTo(50,32);for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;g.lineTo(50+Math.cos(a)*14,34+Math.sin(a)*8);g.lineTo(50+Math.cos(a+.6)*5,34+Math.sin(a+.6)*3);}g.closePath();g.fill();shine(g,36,42,6,14);},
    cabbage(g,c){ellipse(g,50,54,28,26,palette.green);g.strokeStyle='#ffffff66';g.lineWidth=3;g.beginPath();g.arc(50,56,18,2.4,5.8);g.stroke();g.beginPath();g.arc(50,58,10,2.6,5.6);g.stroke();},
    pumpkin(g,c){ellipse(g,50,58,28,22,palette.orange);g.strokeStyle='#00000022';g.lineWidth=3;for(const x of [38,50,62]){g.beginPath();g.moveTo(x,38);g.lineTo(x,78);g.stroke();}rr(g,46,24,8,14,3,palette.leaf);},
    leaf(g,c){g.beginPath();g.moveTo(50,86);g.bezierCurveTo(14,70,22,30,50,16);g.bezierCurveTo(78,30,86,70,50,86);g.fillStyle=palette.green;g.fill();g.strokeStyle='#ffffff77';g.lineWidth=3;g.beginPath();g.moveTo(50,24);g.lineTo(50,82);g.stroke();},
    carrot(g,c){g.beginPath();g.moveTo(36,34);g.lineTo(64,34);g.lineTo(52,88);g.closePath();g.fillStyle=palette.orange;g.fill();g.fillStyle=palette.leaf;for(const d of [-10,0,10])rr(g,46+d,12,6,22,3,palette.leaf);},
    banana(g,c){g.lineCap='round';g.strokeStyle=palette.yellow;g.lineWidth=14;g.beginPath();g.moveTo(24,40);g.bezierCurveTo(30,80,70,80,78,44);g.stroke();g.strokeStyle=palette.brown;g.lineWidth=5;g.beginPath();g.moveTo(22,36);g.lineTo(26,42);g.stroke();},
    apple(g,c){ellipse(g,50,56,26,26,palette.red);g.fillStyle=palette.brown;g.fillRect(48,24,4,12);g.fillStyle=palette.leaf;g.beginPath();g.ellipse(58,28,8,4,-.6,0,7);g.fill();shine(g,36,42,6,16);},
    citrus(g,c){ellipse(g,50,52,26,26,palette.orange);g.fillStyle='#ffffff66';g.beginPath();g.arc(50,52,16,0,7);g.fill();g.strokeStyle=palette.orange;g.lineWidth=2;for(let i=0;i<6;i++){g.beginPath();g.moveTo(50,52);g.lineTo(50+Math.cos(i)*16,52+Math.sin(i)*16);g.stroke();}},
    avocado(g,c){ellipse(g,50,54,24,30,palette.leaf);ellipse(g,50,56,16,22,'#c8e07a');ellipse(g,50,60,8,10,palette.brown);},
    pepper(g,c){rr(g,28,32,44,48,16,palette.green);g.fillStyle='#00000018';g.fillRect(48,32,6,48);rr(g,46,20,8,14,3,palette.leaf);},
    cucumber(g,c){rr(g,22,42,56,18,9,palette.green);g.fillStyle='#ffffff44';g.fillRect(28,46,44,4);},
    beetroot(g,c){ellipse(g,50,58,22,22,'#8f1d4a');g.fillStyle=palette.leaf;for(const d of [-8,0,8])rr(g,47+d,16,5,24,2,palette.leaf);},
    corn(g,c){rr(g,38,20,24,62,12,palette.yellow);g.fillStyle='#00000018';for(let y=26;y<78;y+=10)g.fillRect(38,y,24,3);g.fillStyle=palette.leaf;g.beginPath();g.moveTo(32,88);g.lineTo(40,36);g.lineTo(44,88);g.closePath();g.fill();g.beginPath();g.moveTo(68,88);g.lineTo(60,36);g.lineTo(56,88);g.closePath();g.fill();},
    melon(g,c){g.beginPath();g.arc(50,36,36,0,Math.PI);g.closePath();g.fillStyle=palette.green;g.fill();g.beginPath();g.arc(50,36,28,0,Math.PI);g.closePath();g.fillStyle=palette.red;g.fill();g.fillStyle=palette.dark;for(const [x,y] of [[40,48],[52,56],[62,46]])ellipse(g,x,y,2,3,palette.dark);},
    grapes(g,c){g.fillStyle=palette.purple;for(const [x,y] of [[40,40],[60,40],[30,54],[50,54],[70,54],[40,68],[60,68],[50,82]])ellipse(g,x,y,10,10,palette.purple);g.fillStyle=palette.leaf;g.beginPath();g.ellipse(50,26,10,5,-.4,0,7);g.fill();},
    pear(g,c){ellipse(g,50,60,22,24,'#b9d26b');ellipse(g,50,36,14,16,'#b9d26b');g.fillStyle=palette.brown;g.fillRect(48,16,4,10);},
    mango(g,c){ellipse(g,50,54,22,30,palette.orange,.5);ellipse(g,44,46,12,18,palette.yellow,.5);g.fillStyle=palette.leaf;g.beginPath();g.ellipse(64,26,10,4,.5,0,7);g.fill();},
    berry(g,c){g.beginPath();g.moveTo(50,88);g.bezierCurveTo(20,66,26,34,50,32);g.bezierCurveTo(74,34,80,66,50,88);g.fillStyle=palette.red;g.fill();g.fillStyle=palette.leaf;g.beginPath();g.moveTo(36,34);g.lineTo(50,22);g.lineTo(64,34);g.closePath();g.fill();g.fillStyle=palette.yellow;for(const [x,y] of [[42,50],[56,52],[48,66]])ellipse(g,x,y,2,2,palette.yellow);},
    mushroom(g,c){g.beginPath();g.arc(50,48,28,Math.PI,0);g.closePath();g.fillStyle=palette.kraft;g.fill();rr(g,40,48,20,34,6,palette.cream);},
    kota(g,c){rr(g,24,34,52,46,6,'#e9c889');g.fillStyle=palette.red;g.fillRect(24,52,52,6);g.fillStyle=palette.yellow;g.fillRect(24,58,52,8);g.fillStyle=palette.brown;g.fillRect(24,66,52,8);g.fillStyle='#f3dda6';g.fillRect(24,34,52,8);},
    plate(g,c){ellipse(g,50,58,36,16,palette.white);ellipse(g,50,56,30,12,c.a);ellipse(g,42,52,10,7,palette.yellow);ellipse(g,58,50,10,7,palette.brown);ellipse(g,52,60,8,5,palette.green);},
    burger(g,c){ellipse(g,50,34,26,14,'#e8b76a');rr(g,26,42,48,8,3,palette.green);rr(g,24,50,52,10,3,palette.brown);rr(g,26,60,48,6,2,palette.yellow);rr(g,24,66,52,14,6,'#e8b76a');},
    pizza(g,c){g.beginPath();g.moveTo(50,88);g.lineTo(22,24);g.lineTo(78,24);g.closePath();g.fillStyle=palette.yellow;g.fill();g.beginPath();g.moveTo(22,24);g.lineTo(78,24);g.lineTo(76,30);g.lineTo(24,30);g.closePath();g.fillStyle='#e8b76a';g.fill();for(const [x,y] of [[40,40],[58,42],[50,60]])ellipse(g,x,y,5,5,palette.red);},
    wrap(g,c){rr(g,24,30,52,40,20,'#f3dda6');g.fillStyle=palette.green;g.fillRect(30,44,40,6);g.fillStyle=palette.red;g.fillRect(34,52,32,5);ellipse(g,76,50,6,20,'#e8b76a');},
    scissors(g,c){g.strokeStyle=palette.dark;g.lineWidth=5;g.beginPath();g.moveTo(34,30);g.lineTo(66,70);g.moveTo(66,30);g.lineTo(34,70);g.stroke();ellipse(g,30,78,9,9,c.a);ellipse(g,70,78,9,9,c.a);g.fillStyle=palette.white;ellipse(g,30,78,4,4,palette.white);ellipse(g,70,78,4,4,palette.white);},
    hair(g,c){g.lineCap='round';g.strokeStyle=palette.dark;g.lineWidth=8;for(const x of [36,50,64]){g.beginPath();g.moveTo(x,18);g.bezierCurveTo(x-10,40,x+10,60,x,86);g.stroke();}g.strokeStyle=c.a;g.lineWidth=4;g.beginPath();g.moveTo(28,22);g.lineTo(72,22);g.stroke();},
    hairdryer(g,c){rr(g,22,30,46,26,13,c.a);rr(g,40,52,16,34,6,c.b);ellipse(g,22,43,6,10,c.b);},
    nails(g,c){g.fillStyle=palette.skin;for(const [x,h] of [[28,46],[40,40],[52,38],[64,42]])rr(g,x,88-h,10,h,5,palette.skin);g.fillStyle=c.a;for(const [x,h] of [[28,46],[40,40],[52,38],[64,42]])rr(g,x,88-h,10,9,4,c.a);},
    lashes(g,c){g.strokeStyle=palette.dark;g.lineWidth=4;g.lineCap='round';g.beginPath();g.arc(50,62,30,Math.PI*1.15,Math.PI*1.85);g.stroke();for(let i=0;i<7;i++){const a=Math.PI*(1.2+i*.1);g.beginPath();g.moveTo(50+Math.cos(a)*30,62+Math.sin(a)*30);g.lineTo(50+Math.cos(a)*40,62+Math.sin(a)*40);g.stroke();}ellipse(g,50,66,10,8,c.a);ellipse(g,50,66,4,4,palette.dark);},
    lipstick(g,c){rr(g,38,46,24,40,4,palette.dark);rr(g,40,36,20,12,2,c.b);g.beginPath();g.moveTo(42,36);g.lineTo(42,16);g.lineTo(58,24);g.lineTo(58,36);g.closePath();g.fillStyle=c.a;g.fill();},
    hands(g,c){ellipse(g,50,60,30,14,c.b);rr(g,34,30,10,34,5,palette.skin);rr(g,46,24,10,40,5,palette.skin);rr(g,58,30,10,34,5,palette.skin);},
    razor(g,c){rr(g,24,24,52,18,6,palette.grey);g.fillStyle=palette.dark;g.fillRect(28,30,44,4);rr(g,44,42,12,46,5,c.a);},
    shirt(g,c){g.beginPath();g.moveTo(34,20);g.lineTo(44,16);g.lineTo(50,24);g.lineTo(56,16);g.lineTo(66,20);g.lineTo(84,34);g.lineTo(74,46);g.lineTo(68,42);g.lineTo(68,84);g.lineTo(32,84);g.lineTo(32,42);g.lineTo(26,46);g.lineTo(16,34);g.closePath();g.fillStyle=c.a;g.fill();},
    jeans(g,c){g.beginPath();g.moveTo(30,16);g.lineTo(70,16);g.lineTo(74,86);g.lineTo(56,86);g.lineTo(50,44);g.lineTo(44,86);g.lineTo(26,86);g.closePath();g.fillStyle=palette.blue;g.fill();g.fillStyle=c.b;g.fillRect(30,16,40,8);},
    dress(g,c){g.beginPath();g.moveTo(38,16);g.lineTo(62,16);g.lineTo(60,38);g.lineTo(78,86);g.lineTo(22,86);g.lineTo(40,38);g.closePath();g.fillStyle=c.a;g.fill();g.fillStyle='#ffffff44';g.fillRect(40,34,20,4);},
    jacket(g,c){g.beginPath();g.moveTo(30,22);g.lineTo(70,22);g.lineTo(86,40);g.lineTo(74,50);g.lineTo(70,44);g.lineTo(70,86);g.lineTo(30,86);g.lineTo(30,44);g.lineTo(26,50);g.lineTo(14,40);g.closePath();g.fillStyle=c.a;g.fill();g.fillStyle=c.b;g.fillRect(47,22,6,64);},
    shoe(g,c){g.beginPath();g.moveTo(20,74);g.lineTo(22,50);g.bezierCurveTo(40,46,46,30,56,34);g.lineTo(84,66);g.lineTo(84,74);g.closePath();g.fillStyle=c.a;g.fill();g.fillStyle=palette.white;g.fillRect(20,70,64,8);g.strokeStyle=palette.white;g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.moveTo(44+i*8,46+i*6);g.lineTo(54+i*8,42+i*6);g.stroke();}},
    cap(g,c){g.beginPath();g.arc(48,54,26,Math.PI,0);g.closePath();g.fillStyle=c.a;g.fill();rr(g,44,54,42,10,5,c.b);ellipse(g,48,30,4,4,c.b);},
    'bag-fashion'(g,c){rr(g,24,40,52,44,10,c.a);g.strokeStyle=c.b;g.lineWidth=5;g.beginPath();g.arc(50,40,14,Math.PI,0);g.stroke();rr(g,42,54,16,8,3,c.b);},
    blanket(g,c){rr(g,22,30,56,46,8,c.a);g.fillStyle=c.b;for(let y=38;y<72;y+=10)g.fillRect(22,y,56,4);rr(g,34,22,32,10,4,palette.white);},
    hammer(g,c){rr(g,46,36,10,52,4,palette.kraft);rr(g,26,20,48,20,6,palette.dark);g.fillStyle=c.a;g.fillRect(26,20,14,20);},
    tool(g,c){g.strokeStyle=palette.grey;g.lineWidth=10;g.lineCap='round';g.beginPath();g.moveTo(30,70);g.lineTo(62,38);g.stroke();ellipse(g,66,34,14,14,palette.grey);g.fillStyle=palette.white;g.beginPath();g.rect(60,28,12,12);g.fill();ellipse(g,30,70,8,8,c.a);},
    drill(g,c){rr(g,24,30,44,22,6,c.a);rr(g,66,36,18,10,3,palette.grey);rr(g,36,50,16,34,4,c.b);g.fillStyle=palette.dark;g.fillRect(52,52,8,10);},
    paint(g,c){rr(g,28,32,44,52,6,palette.grey);g.strokeStyle=palette.dark;g.lineWidth=3;g.beginPath();g.arc(50,30,22,Math.PI,0);g.stroke();ellipse(g,50,36,22,8,c.a);g.fillStyle=c.a;g.fillRect(40,42,12,24);},
    brick(g,c){g.fillStyle=palette.red;for(const [x,y,w] of [[20,32,28],[52,32,28],[36,48,28],[20,64,28],[52,64,28]])rr(g,x,y,w,14,2,c.a);},
    roof(g,c){g.fillStyle=palette.grey;for(let x=18;x<84;x+=12){g.beginPath();g.arc(x+6,40,6,Math.PI,0);g.lineTo(x+12,76);g.lineTo(x,76);g.closePath();g.fill();}g.fillStyle=c.a;g.fillRect(18,74,66,6);},
    plank(g,c){g.save();g.translate(50,50);g.rotate(-.5);rr(g,-36,-10,72,20,3,palette.kraft);g.fillStyle='#00000018';g.fillRect(-36,-2,72,3);g.restore();},
    door(g,c){rr(g,28,14,44,72,4,palette.kraft);rr(g,34,22,32,26,2,'#00000018');rr(g,34,52,32,26,2,'#00000018');ellipse(g,62,52,3,3,palette.dark);},
    pipe(g,c){rr(g,18,42,64,16,8,palette.grey);rr(g,16,38,10,24,4,palette.dark);rr(g,74,38,10,24,4,palette.dark);shine(g,30,45,40,4);},
    tank(g,c){rr(g,26,26,48,58,10,c.a);ellipse(g,50,26,24,8,c.b);g.fillStyle='#00000018';g.fillRect(26,50,48,4);rr(g,44,14,12,10,3,c.b);},
    fence(g,c){g.strokeStyle=palette.grey;g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(18+i*16,22);g.lineTo(18+i*16,82);g.stroke();}for(let i=0;i<4;i++){g.beginPath();g.moveTo(18,30+i*16);g.lineTo(82,30+i*16);g.stroke();}g.fillStyle=c.a;g.fillRect(18,80,64,5);},
    car(g,c){rr(g,18,46,64,22,8,c.a);g.beginPath();g.moveTo(30,46);g.lineTo(40,30);g.lineTo(64,30);g.lineTo(72,46);g.closePath();g.fillStyle=c.b;g.fill();ellipse(g,32,70,8,8,palette.dark);ellipse(g,68,70,8,8,palette.dark);},
    tyre(g,c){ellipse(g,50,50,32,32,palette.dark);ellipse(g,50,50,18,18,palette.grey);ellipse(g,50,50,8,8,c.a);},
    phone(g,c){rr(g,32,14,36,72,8,palette.dark);rr(g,36,22,28,52,3,c.b);ellipse(g,50,80,3,3,palette.grey);},
    book(g,c){rr(g,26,18,48,64,4,c.a);g.fillStyle=c.b;g.fillRect(26,18,8,64);g.fillStyle='#ffffff77';g.fillRect(42,34,24,4);g.fillRect(42,44,24,4);g.fillRect(42,54,16,4);},
    pen(g,c){g.save();g.translate(50,50);g.rotate(.7);rr(g,-6,-36,12,56,3,c.a);g.beginPath();g.moveTo(-6,20);g.lineTo(6,20);g.lineTo(0,34);g.closePath();g.fillStyle=palette.dark;g.fill();g.restore();},
    printer(g,c){rr(g,22,42,56,30,6,c.a);rr(g,32,24,36,20,3,palette.white);rr(g,32,66,36,16,3,palette.white);g.fillStyle=c.b;g.fillRect(30,50,40,4);},
    basket(g,c){g.beginPath();g.moveTo(22,40);g.lineTo(78,40);g.lineTo(70,84);g.lineTo(30,84);g.closePath();g.fillStyle=c.a;g.fill();g.strokeStyle=c.b;g.lineWidth=4;g.beginPath();g.arc(50,40,18,Math.PI,0);g.stroke();g.fillStyle='#00000018';for(let y=50;y<80;y+=10)g.fillRect(26,y,48,3);},
    pet(g,c){ellipse(g,50,58,22,20,c.a);ellipse(g,30,42,8,10,c.a);ellipse(g,70,42,8,10,c.a);ellipse(g,42,56,3,3,palette.dark);ellipse(g,58,56,3,3,palette.dark);ellipse(g,50,66,5,3,palette.dark);},
    nappy(g,c){g.beginPath();g.moveTo(22,30);g.lineTo(78,30);g.lineTo(78,52);g.bezierCurveTo(78,76,22,76,22,52);g.closePath();g.fillStyle=palette.white;g.fill();g.strokeStyle=c.a;g.lineWidth=3;g.stroke();g.fillStyle=c.b;g.fillRect(22,30,56,8);},
    generic(g,c){tagShape(g,c);}
  };
  function tagShape(g,c){g.beginPath();g.moveTo(40,16);g.lineTo(84,16);g.lineTo(84,60);g.lineTo(50,88);g.lineTo(16,54);g.lineTo(16,40);g.closePath();g.fillStyle=c.a;g.fill();ellipse(g,30,30,5,5,palette.white);}
  const ids=Object.keys(draw);
  function colours(brand,accent){
    return {a:brand||palette.blue,b:accent||palette.yellow};
  }
  // Render an illustration into a square canvas of the requested size. Results
  // are cached by id, size bucket and palette so flyers redraw quickly.
  function render(id,size=240,brand='',accent=''){
    const key=id in draw?id:'generic',px=Math.max(48,Math.min(1600,Math.ceil(size/64)*64)),cacheKey=key+'|'+px+'|'+brand+'|'+accent;
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const canvas=document.createElement('canvas');canvas.width=px;canvas.height=px;const g=canvas.getContext('2d');
    g.fillStyle='#ffffff';g.fillRect(0,0,px,px);
    g.save();g.scale(px/100,px/100);
    ellipse(g,50,52,42,42,palette.paper);
    g.lineJoin='round';draw[key](g,colours(brand,accent));
    g.restore();
    canvas.isIllustration=true;canvas.sourceWidth=px*4;canvas.sourceHeight=px*4;
    if(cache.size>120)cache.delete(cache.keys().next().value);
    cache.set(cacheKey,canvas);return canvas;
  }
  const urls=new Map();
  function dataURL(id,size=96){const key=id+'|'+size;if(!urls.has(key))urls.set(key,render(id,size).toDataURL('image/png'));return urls.get(key);}
  root.ShopDeskIllustrations={ids,render,dataURL,palette};
})(typeof window!=='undefined'?window:globalThis);
