/* CYCLONENET - Emergency Network Simulation */
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const state={
  nodes:12, load:55, distance:12, loss:4, battery:82, backhaul:70,
  cow:false, partition:false, handoff:false, mobileip:false, aodv:false,
  alerts:[], scenarioStep:0, selectedTech:"FDMA", selectedChart:"delivery"
};
const nodeData=[
 {id:"COW",name:"COW Base Station",type:"Base Station",lat:13.070,lng:80.245,icon:"📡",status:"ACTIVE"},
 {id:"CAMP",name:"Relief Camp",type:"Relief Camp",lat:13.082,lng:80.272,icon:"⛺",status:"CONNECTED"},
 {id:"V1",name:"Village North",type:"Affected Village",lat:13.105,lng:80.215,icon:"🏚",status:"OFFLINE"},
 {id:"V2",name:"Village East",type:"Affected Village",lat:13.052,lng:80.305,icon:"🏚",status:"OFFLINE"},
 {id:"RV",name:"Rescue Vehicle",type:"Mobile Node",lat:13.060,lng:80.260,icon:"🚑",status:"MOVING"},
 {id:"AMB",name:"Ambulance",type:"Emergency Unit",lat:13.094,lng:80.285,icon:"🚨",status:"ACTIVE"},
 {id:"RT",name:"Rescue Team",type:"Ad-Hoc Node",lat:13.075,lng:80.290,icon:"🛟",status:"READY"},
 {id:"SURV",name:"Surviving Network",type:"Legacy Segment",lat:13.045,lng:80.330,icon:"📶",status:"ONLINE"}
];
let overviewMap, mainMap, markers={}, lines=[];
let overviewChart, performanceChart;

function toast(msg){let t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2800)}
function now(){return new Date().toLocaleTimeString([], {hour12:false})}
function addAlert(level,title,msg){state.alerts.unshift({level,title,msg,time:now()}); if(state.alerts.length>30)state.alerts.pop(); renderAlerts(); $("#alertCount").textContent=state.alerts.filter(a=>a.level==="critical").length; }
function renderAlerts(){
 const html=state.alerts.map(a=>`<div class="alert-item ${a.level}"><i class="sev"></i><div><b>${a.title}</b><p>${a.msg}</p></div><time>${a.time}</time></div>`).join("");
 $("#alertFeed").innerHTML=html||`<div class="report-empty" style="height:180px">No events yet.</div>`;
 $("#alertsFull").innerHTML=html||`<div class="report-empty">No events recorded.</div>`;
}
function metricValue(){
 const delivery=Math.max(45,Math.min(99,96-state.load*.18-state.loss*.55+state.backhaul*.04+(state.cow?4:0)));
 const delay=Math.max(12,Math.round(18+state.load*.48+state.distance*.7+state.loss*.9-(state.cow?9:0)));
 const reliability=Math.max(45,Math.min(99,98-state.loss*.65-state.load*.08+(state.cow?3:0)-(state.partition?18:0)));
 const loss=Math.max(1,Math.min(45,100-delivery));
 return {delivery:+delivery.toFixed(1),delay,reliability:+reliability.toFixed(1),loss:+loss.toFixed(1)};
}
function renderMetrics(){
 const m=metricValue(), active=state.cow?Math.max(8,Math.round(state.nodes*.82)):Math.max(3,Math.round(state.nodes*.35));
 const users=state.cow?Math.round(340+state.nodes*29-state.load*.8):Math.round(85+state.nodes*8);
 const routes=state.partition?Math.max(2,Math.round(state.nodes*.32)):Math.max(4,Math.round(state.nodes*.58));
 const coverage=state.cow?Math.min(98,62+state.distance*1.7):18;
 const data=[
  ["◉","Active Nodes",active,"+2.4%"],["♙","Connected Users",users,"LIVE"],["⌁","Active Routes",routes,state.partition?"RECOVERING":"STABLE"],
  ["◌","Coverage",coverage+"%","+18.6%"],["▣","Packet Delivery",m.delivery+"%","+1.8%"],["◷","Avg Delay",m.delay+" ms",state.load>70?"HIGH":"NORMAL"],
  ["✓","Reliability",m.reliability+"%","TARGET 99%"],["▰","Packet Loss",m.loss+"%",state.loss>10?"HIGH":"LOW"]
 ];
 $("#metricGrid").innerHTML=data.map(x=>`<div class="metric-card"><div class="metric-icon">${x[0]}</div><small>${x[1]}</small><strong>${x[2]}</strong><div class="delta">${x[3]}</div></div>`).join("");
 $("#analysisMetrics").innerHTML=data.slice(4).map(x=>`<div class="metric-card"><div class="metric-icon">${x[0]}</div><small>${x[1]}</small><strong>${x[2]}</strong><div class="delta">${x[3]}</div></div>`).join("");
 renderCowTelemetry(); renderQuickControls(); renderAnalysisControls();
}
function renderQuickControls(){
 const arr=[["Nodes","nodes",4,30],["Network Load","load",0,100],["Distance","distance",2,25],["Packet Loss","loss",0,30],["Battery","battery",0,100],["Backhaul","backhaul",10,100]];
 $("#quickControls").innerHTML=arr.map(a=>`<div class="slider-row"><label>${a[0]}</label><input type="range" min="${a[2]}" max="${a[3]}" value="${state[a[1]]}" data-key="${a[1]}"><output>${state[a[1]]}${a[1]==="distance"?" km":a[1]==="nodes"?"":"%"}</output></div>`).join("");
}
function renderAnalysisControls(){
 const arr=[["Number of nodes","nodes",4,30],["Network load","load",0,100],["Distance","distance",2,25],["Packet loss","loss",0,30],["Battery level","battery",0,100],["Backhaul bandwidth","backhaul",10,100]];
 $("#analysisControls").innerHTML=arr.map(a=>`<div class="control-box"><label>${a[0]} <output>${state[a[1]]}${a[1]==="distance"?" km":a[1]==="nodes"?"":"%"}</output></label><input type="range" min="${a[2]}" max="${a[3]}" value="${state[a[1]]}" data-key="${a[1]}"></div>`).join("");
 $$("input[data-key]").forEach(x=>x.oninput=handleSlider);
}
function handleSlider(e){state[e.target.dataset.key]=+e.target.value; renderMetrics(); updateCharts(); updateMapLinks(); if(state.battery<25)addAlert("critical","LOW BATTERY","COW battery is below operational threshold. Deploy recharge support.");}
function initMap(el){
 const map=L.map(el,{zoomControl:true,attributionControl:false}).setView([13.075,80.275],12.5);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);
 nodeData.forEach(n=>{
   const color=n.id==="COW"?"#20d8ff":n.status==="OFFLINE"?"#ff5e6c":"#31d69a";
   const marker=L.circleMarker([n.lat,n.lng],{radius:n.id==="COW"?13:8,color,fillColor:color,fillOpacity:.8,weight:2}).addTo(map).bindPopup(`<b>${n.icon} ${n.name}</b><br>${n.type}<br>Status: ${n.status}`);
   markers[n.id]=marker;
 });
 drawLinks(map); return map;
}
function drawLinks(map){
 lines.forEach(l=>map.removeLayer(l)); lines=[];
 const links=[
  ["COW","CAMP","active"],["COW","RV","mip"],["COW","AMB","active"],["COW","RT","active"],["COW","V1","active"],["COW","V2","fail"],
  ["CAMP","RT","adhoc"],["RT","AMB","adhoc"],["RV","SURV","active"]
 ];
 links.forEach(([a,b,type])=>{
   const A=nodeData.find(n=>n.id===a),B=nodeData.find(n=>n.id===b);
   let c=type==="active"?"#31d69a":type==="mip"?"#a978ff":type==="adhoc"?"#ffbf55":"#ff5e6c";
   let l=L.polyline([[A.lat,A.lng],[B.lat,B.lng]],{color:c,weight:type==="fail"?3:2,dashArray:type==="fail"?"7 8":type==="adhoc"?"4 6":null,opacity:.8}).addTo(map);
   lines.push(l);
 });
}
function updateMapLinks(){if(overviewMap)drawLinks(overviewMap);if(mainMap)drawLinks(mainMap)}
function buildNodeCards(){
 $("#nodeCards").innerHTML=nodeData.map(n=>`<div class="node-card"><div class="node-emoji">${n.icon}</div><b>${n.name}</b><small>${n.type} • <span style="color:${n.status==="OFFLINE"?"#ff6b76":"#63dcb3"}">${n.status}</span></small></div>`).join("");
}
function updateCharts(){
 const m=metricValue();
 const labels=["Initial","Load 20%","Load 40%","Load 60%","Load 80%","Current"];
 const d=labels.map((_,i)=>Math.max(35,Math.min(99,m.delivery+(5-i*2)+(i===5?0:state.load/20))));
 const a=labels.map((_,i)=>Math.max(10,m.delay-i*2+state.loss));
 const r=labels.map((_,i)=>Math.max(40,Math.min(99,m.reliability+(i<3?2:0))));
 const data=state.selectedChart==="delay"?a:state.selectedChart==="reliability"?r:d;
 overviewChart.data.labels=labels;overviewChart.data.datasets[0].data=data;overviewChart.data.datasets[0].label=state.selectedChart.toUpperCase();overviewChart.update();
 const mip=state.selectedChart==="delay"?a.map(v=>v*.88):state.selectedChart==="loss"?d.map(v=>100-v*.85):d.map(v=>Math.min(100,v+3));
 const adh=state.selectedChart==="delay"?a.map(v=>v*1.12):state.selectedChart==="loss"?d.map(v=>100-v*.7):d.map(v=>Math.max(40,v-4));
 performanceChart.data.labels=["Low","Moderate","High","Severe","Partition"];
 performanceChart.data.datasets[0].data=mip.map((v,i)=>state.selectedChart==="delay"?Math.round(v+(i===4?20:0)):+Math.max(1,v-(i===4?14:0)).toFixed(1));
 performanceChart.data.datasets[1].data=adh.map((v,i)=>state.selectedChart==="delay"?Math.round(v+(i===4?35:0)):+Math.max(1,v-(i===4?27:0)).toFixed(1));
 performanceChart.options.scales.y.title.text=state.selectedChart==="delay"?"Milliseconds":"Percentage";
 performanceChart.update();
}
function initCharts(){
 const common={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#8ea2b8",font:{size:10}}}},scales:{x:{grid:{color:"rgba(255,255,255,.04)"},ticks:{color:"#71879b",font:{size:9}}},y:{grid:{color:"rgba(255,255,255,.05)"},ticks:{color:"#71879b",font:{size:9}}}}};
 overviewChart=new Chart($("#overviewChart"),{type:"line",data:{labels:[],datasets:[{label:"DELIVERY",data:[],borderColor:"#20d8ff",backgroundColor:"rgba(32,216,255,.08)",fill:true,tension:.4,pointRadius:2}]},options:common});
 performanceChart=new Chart($("#performanceChart"),{type:"bar",data:{labels:[],datasets:[{label:"Mobile IP",data:[],backgroundColor:"#a978ff",borderRadius:5},{label:"Ad-Hoc AODV",data:[],backgroundColor:"#ffbf55",borderRadius:5}]},options:{...common,plugins:{...common.plugins},scales:{...common.scales,y:{...common.scales.y}}}});
 updateCharts();
}
function renderCowTelemetry(){
 const m=metricValue(), coverage=state.cow?Math.min(98,62+state.distance*1.7):18;
 $("#cowTelemetry").innerHTML=[["Deployment",state.cow?"ONLINE":"STANDBY"],["Coverage radius",state.cow?Math.round(coverage/7)+" km":"0 km"],["Connected users",state.cow?Math.round(340+state.nodes*29):0],["Battery",state.battery+"%"],["Backhaul",state.backhaul+" Mbps"],["Packet delivery",m.delivery+"%"]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");
 $("#coverageFill").style.width=coverage+"%";$("#coverageValue").textContent=state.cow?Math.round(coverage/7)+" km effective radius":"COW not deployed";
}
function deployCow(){
 if(state.cow){toast("COW is already deployed and serving users.");return}
 state.cow=true; addAlert("info","COW DEPLOYMENT","Rapid-deployment COW has been dispatched to the coastal response zone.");
 let p=0;const timer=setInterval(()=>{p+=10;$("#cowProgress").style.width=p+"%";$("#cowProgressText").textContent=p+"%";if(p>=100){clearInterval(timer);$("#cowStatus").textContent="ONLINE";$("#cowStatus").style.color="#70e2bd";$("#cowStatus").style.borderColor="#1a4c43";$("#cowStatus").style.background="#0b2926";addAlert("info","CONNECTIVITY RESTORED","COW BTS/BSC/MSC path is operational. Affected users can re-register.");toast("COW deployed. Coverage restored.");}},250);
 renderMetrics();
}
function runMobileIP(){
 state.mobileip=true; const steps=["Home Agent","Foreign Agent","Care-of Address","MN Registration","Packet Transmission","Handoff"];
 $("#mobileSteps").innerHTML=steps.map((s,i)=>`<div id="mstep${i}">${s}</div>`).join("");
 $("#mobileResults").innerHTML="";
 $("#mobileLog").innerHTML="";
 steps.forEach((s,i)=>setTimeout(()=>{
   $("#mstep"+i).classList.add("done");
   const msgs=[
    "HA: Home address verified for rescue vehicle.",
    "FA: Foreign network advertisement received.",
    "CoA: 172.16.20.45 assigned by COW.",
    "REG: Mobile Node registration request accepted.",
    "DATA: Encapsulated packet tunnel established.",
    "HANDOFF: Session maintained while moving between agents."
   ];
   $("#mobileLog").innerHTML+=`<div><span class="cyan">[${now()}]</span> ${msgs[i]}</div>`;
   if(i===5){let delay=Math.round(22+state.distance*1.4+state.load*.25),hops=3+Math.round(state.distance/8);$("#mobileResults").innerHTML=[["Care-of Address","172.16.20.45"],["Registration","SUCCESS"],["Hop Count",hops],["Dynamic Delay",delay+" ms"],["Packet Delivery",metricValue().delivery+"%"],["Tunnel State","ACTIVE"]].map(x=>`<div class="result"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");addAlert("info","MOBILE IP REGISTERED","Rescue vehicle registered through Foreign Agent; packet tunnel is active.");toast("Mobile IP registration completed.");}
 },i*650));
}
const aNodes=[
 ["S",12,50],["R1",28,28],["R2",30,72],["R3",48,46],["R4",58,22],["R5",62,72],["R6",76,43],["D",89,60],["C",74,82]
];
const aLinks=[["S","R1"],["S","R2"],["R1","R3"],["R2","R3"],["R2","C"],["R3","R4"],["R3","R5"],["R4","R6"],["R5","R6"],["R6","D"],["C","D"]];
function renderAodv(){
 const c=$("#aodvCanvas");c.innerHTML="";
 aNodes.forEach(n=>{let d=document.createElement("div");d.className="a-node";d.id="an-"+n[0];d.textContent=n[0];d.style.left=n[1]+"%";d.style.top=n[2]+"%";c.appendChild(d)});
 aLinks.forEach((l,i)=>{let A=aNodes.find(n=>n[0]===l[0]),B=aNodes.find(n=>n[0]===l[1]);let d=document.createElement("div");d.className="a-link";d.id="al-"+i;let x1=A[1],y1=A[2],x2=B[1],y2=B[2],dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);d.style.left=x1+"%";d.style.top=y1+"%";d.style.width=len+"%";d.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;c.appendChild(d)});
 const opts=aNodes.map(n=>`<option value="${n[0]}">${n[0]}</option>`).join("");$("#aodvSource").innerHTML=opts;$("#aodvDest").innerHTML=opts;$("#aodvSource").value="S";$("#aodvDest").value="D";
}
function runAodv(){
 const s=$("#aodvSource").value,d=$("#aodvDest").value; if(s===d){toast("Source and destination must be different.");return}
 const adj={};aNodes.forEach(n=>adj[n[0]]=[]);aLinks.forEach((l,i)=>{adj[l[0]].push([l[1],i]);adj[l[1]].push([l[0],i])});
 let q=[[s,[s],[]]],visited=new Set([s]),found=null;
 while(q.length){let [u,path,edges]=q.shift();if(u===d){found=[path,edges];break}for(const [v,e] of adj[u])if(!visited.has(v)){visited.add(v);q.push([v,[...path,v],[...edges,e]])}}
 if(state.partition && (s==="S"&&d==="D")) found=null;
 $$(" .a-node").forEach(x=>x.classList.remove("source","dest","path")); // harmless selector if spaces
 aNodes.forEach(n=>$("#an-"+n[0]).classList.remove("source","dest","path"));
 $("#an-"+s).classList.add("source");$("#an-"+d).classList.add("dest");
 $("#aodvLog").innerHTML=`<div class="cyan">[${now()}] RREQ broadcast from ${s} → ${d}</div>`;
 setTimeout(()=>{
   if(!found){$("#routeResult").className="route-result failed";$("#routeResult").textContent="NETWORK PARTITION: No route available between selected nodes. AODV will continue route discovery when connectivity returns.";$("#aodvMetrics").innerHTML=[["Route","UNAVAILABLE"],["Hop Count","—"],["Delay","∞"],["Packet Delivery","0%"],["Action","RETRY / RECOVER"]].map(x=>`<div class="result"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");$("#aodvLog").innerHTML+=`<div class="err">[${now()}] RREQ timeout — destination unreachable.</div>`;addAlert("critical","AODV ROUTE FAILURE","Network partition detected. Destination is unreachable.");return}
   found[0].forEach(n=>$("#an-"+n).classList.add("path"));found[1].forEach(i=>$("#al-"+i).classList.add("path"));
   const hops=found[0].length-1,delay=Math.round(12+hops*7+state.load*.18+state.loss*.5),delivery=Math.max(55,96-state.loss-hops*1.5);
   $("#routeResult").className="route-result success";$("#routeResult").textContent=`RREQ reached ${d}. RREP returned through ${found[0].join(" → ")}.`;
   $("#aodvMetrics").innerHTML=[["Route",found[0].join(" → ")],["Hop Count",hops],["Delay",delay+" ms"],["Packet Delivery",delivery.toFixed(1)+"%"],["Routing","AODV / ON-DEMAND"]].map(x=>`<div class="result"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");
   $("#aodvLog").innerHTML+=`<div class="cyan">[${now()}] RREP returned via ${found[0].join(" → ")}.</div><div>[${now()}] Route installed. ${hops} hops, ${delay} ms estimated delay.</div>`;state.aodv=true;addAlert("info","AODV ROUTE DISCOVERED","Multi-hop route established for relief-camp traffic.");toast("AODV route discovered.");
 },500);
}
function togglePartition(){state.partition=!state.partition;$("#partitionToggle").textContent=state.partition?"RESTORE NETWORK":"SIMULATE PARTITION";$("#partitionToggle").classList.toggle("danger-btn",state.partition);$("#partitionToggle").classList.toggle("ghost-btn",!state.partition);if(state.partition)addAlert("critical","NETWORK PARTITION","A communication segment has been isolated. AODV alternate-route discovery required.");else{addAlert("info","NETWORK RECOVERED","Partition cleared. Alternate paths are available.");}renderMetrics();updateMapLinks();}
function runHandoff(){
 if(!state.cow){addAlert("warning","HANDOFF DELAYED","Deploy the COW before moving the rescue vehicle.");toast("Deploy COW first.");return}
 state.handoff=true;const v=$("#rescueVehicle");$("#handoffTimeline").innerHTML=["COW coverage active","Signal weakening","Foreign segment detected","Mobile IP handoff","Session maintained"].map((x,i)=>`<div class="time-step" id="ht${i}">${x}</div>`).join("");
 let i=0;const t=setInterval(()=>{$("#ht"+i).classList.add("active");if(i===1)v.style.left="42%";if(i===2)v.style.left="62%";if(i===3)v.style.left="76%";if(i===4){clearInterval(t);v.style.left="84%";$("#handoffStats").innerHTML=[["Current Network","Surviving Segment"],["Handoff","SUCCESS"],["Session Loss","0 packets"],["Continuity","MAINTAINED"]].map(x=>`<div class="handoff-stat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");addAlert("info","HANDOFF COMPLETE","Rescue vehicle moved outside COW coverage and maintained the session via surviving network.");toast("Handoff successful — session maintained.");}i++},850);
}
const tech={
 FDMA:{title:"Frequency Division Multiple Access",desc:"Users are separated by dedicated frequency bands. It is simple and predictable, but spectrum is less efficiently shared under bursty emergency traffic.",use:"Legacy cellular / simple voice fallback",pros:["Predictable channel allocation","Simple implementation"],cons:["Lower spectrum efficiency","Limited flexibility"]},
 TDMA:{title:"Time Division Multiple Access",desc:"Users share the same frequency but transmit in different time slots. It improves sharing while retaining scheduled access.",use:"2G-era voice and signaling fallback",pros:["Structured time sharing","Supports multiple users"],cons:["Slot synchronization required","Lower data capability"]},
 CDMA:{title:"Code Division Multiple Access",desc:"Users share time and frequency using distinct spreading codes. It provides robust interference handling and soft handoff characteristics.",use:"3G-era emergency voice/data",pros:["Good interference tolerance","Soft handoff support"],cons:["Complex power control","Capacity management is harder"]},
 OFDMA:{title:"Orthogonal Frequency Division Multiple Access",desc:"Subcarriers are dynamically allocated to users. It provides high spectral efficiency, flexible scheduling and strong support for broadband data.",use:"4G LTE / 5G emergency broadband — recommended",pros:["High throughput","Flexible resource allocation"],cons:["More complex radio design","Sensitive to synchronization"]}
};
function renderTech(){
 const t=tech[state.selectedTech];$("#techDetail").innerHTML=`<div class="tech-detail-grid"><div><span class="eyebrow">SELECTED ACCESS METHOD</span><h2>${t.title}</h2><p>${t.desc}</p><p><b>Emergency suitability:</b> ${t.use}</p></div><div class="proscons"><div><b>STRENGTHS</b><ul>${t.pros.map(x=>`<li>${x}</li>`).join("")}</ul></div><div><b>LIMITATIONS</b><ul>${t.cons.map(x=>`<li>${x}</li>`).join("")}</ul></div></div></div>`;
 $("#generationGrid").innerHTML=[
  ["2G","GSM / EDGE","Voice, SMS, low-rate data. Useful only as legacy fallback where surviving infrastructure exists.","fallback"],
  ["3G","UMTS / HSPA","Improved mobile data and voice; can support basic emergency applications.",""],
  ["4G","LTE","High-speed IP data, video, maps and fleet coordination. Recommended for modern response traffic.","recommended"],
  ["5G","NR","Very high capacity, low latency and advanced slicing/private-network options. Recommended where deployed.","recommended"]
 ].map(g=>`<div class="gen-card ${g[3]}">${g[3]?'<span class="recommend">RECOMMENDED</span>':''}<div class="gen">${g[0]}</div><h3>${g[1]}</h3><p>${g[2]}</p></div>`).join("");
}
function drawPartition(){
 const c=$("#partitionMap");c.innerHTML="";
 const pts={A:[12,48],B:[32,25],C:[50,48],D:[68,25],E:[88,48],F:[68,72]};
 const links=[["A","B"],["B","C"],["C","D"],["D","E"],["C","F"],["F","E"]];
 Object.entries(pts).forEach(([id,p])=>{let d=document.createElement("div");d.className="pnode";d.id="pn"+id;d.textContent=id;d.style.left=p[0]+"%";d.style.top=p[1]+"%";c.appendChild(d)});
 links.forEach((l,i)=>{let A=pts[l[0]],B=pts[l[1]],d=document.createElement("div");d.className="plink";d.id="pl"+i;let dx=B[0]-A[0],dy=B[1]-A[1],len=Math.sqrt(dx*dx+dy*dy);d.style.left=A[0]+"%";d.style.top=A[1]+"%";d.style.width=len+"%";d.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;c.appendChild(d)});
}
function runPartition(){
 state.partition=true; $("#partitionStatus").style.background="#2b171c";$("#partitionStatus").style.borderColor="#6c2834";$("#partitionStatus").style.color="#ff7c87";$("#partitionStatus").innerHTML="<b>PARTITION DETECTED</b><span>Primary route B → C → D has failed. AODV is searching for an alternate path.</span>";
 $("#pl2").classList.add("broken");$("#pnC").style.borderColor="#ff5e6c";$("#pnD").style.borderColor="#ff5e6c";
 $("#partitionBars").innerHTML=[["Delivery",96,58],["Reliability",98,71],["Loss",4,29],["Delay",22,88]].map(x=>`<div class="bar-row"><span>${x[0]}</span><div class="bar-bg"><i style="width:${x[2]}%"></i></div><b>${x[2]}${x[0]==="Delay"?" ms":"%"}</b></div>`).join("");
 $("#recoveryLog").innerHTML=`<div class="warn">[${now()}] LINK FAILURE: primary segment unavailable.</div><div>[${now()}] AODV RREQ flooded through alternate neighbors.</div>`;
 setTimeout(()=>{state.partition=false;$("#pl2").classList.remove("broken");$("#partitionStatus").style.background="#0b2926";$("#partitionStatus").style.borderColor="#1c5c50";$("#partitionStatus").style.color="#73dfbd";$("#partitionStatus").innerHTML="<b>NETWORK RECOVERED</b><span>Alternate route found through the lower path. Critical traffic is restored.</span>";$("#recoveryLog").innerHTML+=`<div class="cyan">[${now()}] RREP received. Alternate route C → F → E installed.</div>`;addAlert("info","NETWORK RECOVERY","AODV established an alternate route after partition.");renderMetrics();toast("Network recovered using alternate AODV route.");},2400);
 addAlert("critical","NETWORK PARTITION","Primary communication path has failed. Resilience engine activated.");
 renderMetrics();
}
function generateReport(){
 const m=metricValue(),d=new Date().toLocaleString();
 $("#reportPreview").innerHTML=`<div class="report-doc"><span class="eyebrow">CYCLONENET • INCIDENT REPORT</span><h1>Cyclone Emergency Communication Network</h1><div class="report-meta">Generated ${d} • Coastal District Disaster Response • Simulation status: ${state.scenarioStep>=7?"RECOVERED":"IN PROGRESS"}</div>
 <div class="report-section"><h3>Executive Summary</h3><p>The simulation models a cyclone that damages fixed telecom infrastructure and restores emergency connectivity through a Cell on Wheels, Mobile IP mobility management and Ad-Hoc AODV routing. Current network reliability is <b>${m.reliability}%</b> with packet delivery of <b>${m.delivery}%</b>.</p></div>
 <div class="report-section"><h3>Network Status</h3><table class="report-table"><tr><th>Parameter</th><th>Current Value</th></tr>${[["COW deployment",state.cow?"Operational":"Standby"],["Active nodes",state.nodes],["Connected users",state.cow?Math.round(340+state.nodes*29):0],["Coverage",state.cow?Math.min(98,62+state.distance*1.7).toFixed(0)+"%":"18%"],["Packet delivery",m.delivery+"%"],["Average delay",m.delay+" ms"],["Reliability",m.reliability+"%"],["Packet loss",m.loss+"%"],["Battery",state.battery+"%"],["Backhaul",state.backhaul+" Mbps"]].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join("")}</table></div>
 <div class="report-section"><h3>Protocol Findings</h3><p><b>Mobile IP:</b> supports transparent mobility through Home Agent, Foreign Agent and Care-of Address registration. <br><b>Ad-Hoc AODV:</b> discovers routes on demand using RREQ/RREP and provides alternate routing during network partition.</p></div>
 <div class="report-section"><h3>Recommendation</h3><p>Use 4G LTE/5G as the primary broadband emergency bearer where infrastructure is available. Retain 2G/legacy networks as fallback for basic voice/SMS. Deploy COW units quickly after fixed-site failures and use AODV mesh links for local resilience.</p></div>
 <div class="report-section"><h3>Event Summary</h3><p>${state.alerts.length} events recorded. Latest event: ${state.alerts[0]?state.alerts[0].title:"No events"}.</p></div></div>`;
 toast("Operational report generated.");
}
async function startScenario(){
 const btn=$("#startSimulation");btn.disabled=true;btn.textContent="⚡ SIMULATION RUNNING...";
 const steps=[
  ()=>{addAlert("critical","CYCLONE IMPACT","Fixed telecom towers and fibre backhaul damaged. Multiple villages have lost connectivity.");},
  ()=>{addAlert("critical","VILLAGE CONNECTIVITY LOSS","Village North and Village East are isolated from the surviving network.");},
  ()=>{deployCow();},
  ()=>{addAlert("info","USERS RECONNECTED","Affected residents and response teams have attached to the emergency COW cell.");},
  ()=>{runMobileIP();},
  ()=>{runHandoff();},
  ()=>{$("#partition").scrollIntoView({behavior:"smooth"});runPartition();},
  ()=>{state.scenarioStep=7;addAlert("info","RELIEF CAMP AD-HOC","Relief camp established local mesh communication using AODV.");renderMetrics();},
  ()=>{state.scenarioStep=8;addAlert("info","MISSION NETWORK RECOVERED","Emergency communication paths stabilized. Critical response services remain connected.");toast("Complete disaster scenario demonstrated.");}
 ];
 for(let i=0;i<steps.length;i++){await new Promise(r=>setTimeout(r,i===0?500:2300));steps[i]()}
 btn.disabled=false;btn.textContent="⚡ RUN SCENARIO AGAIN";
}
function showSection(id){
 $$(".page").forEach(p=>p.classList.remove("active-page"));$("#"+id).classList.add("active-page");
 $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.section===id));
 $("#pageTitle").textContent=$(`[data-section="${id}"]`)?.querySelector("span")?.textContent||"Command Overview";
 if(id==="map"){setTimeout(()=>mainMap.invalidateSize(),100)} if(id==="overview"){setTimeout(()=>overviewMap.invalidateSize(),100)}
 window.scrollTo({top:0,behavior:"smooth"});
}
function bind(){
 $("#loginForm").onsubmit=e=>{e.preventDefault();$("#loginScreen").classList.add("hidden");$("#app").classList.remove("hidden");toast("Welcome to CycloneNet Control Center.");};
 $("#logoutBtn").onclick=()=>{location.reload()};
 $("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
 $$(".nav-link").forEach(a=>a.onclick=()=>{showSection(a.dataset.section);$(".sidebar").classList.remove("open")});
 $$("[data-go]").forEach(b=>b.onclick=()=>showSection(b.dataset.go));
 $("#startSimulation").onclick=startScenario;$("#deployCow").onclick=deployCow;$("#runMobileIP").onclick=runMobileIP;$("#runAodv").onclick=runAodv;$("#partitionToggle").onclick=togglePartition;$("#runHandoff").onclick=runHandoff;$("#runPartition").onclick=runPartition;$("#generateReport").onclick=generateReport;
 $("#resetMap").onclick=()=>{state.cow=false;state.handoff=false;state.partition=false;state.mobileip=false;renderMetrics();addAlert("info","SCENARIO RESET","Network simulation has been returned to its initial state.");toast("Map scenario reset.");};
 $("#overviewMetric").onchange=e=>{state.selectedChart=e.target.value;updateCharts()};
 $$(".tech-tabs button").forEach(b=>b.onclick=()=>{$$(".tech-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.selectedTech=b.dataset.tech;renderTech()});
 $$(".chart-tabs button").forEach(b=>b.onclick=()=>{$$(".chart-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.selectedChart=b.dataset.chart;updateCharts()});
 $("#randomizeMetrics").onclick=()=>{state.load=Math.round(Math.random()*90+5);state.loss=Math.round(Math.random()*15);state.distance=Math.round(Math.random()*20+3);renderMetrics();updateCharts();toast("Performance test randomized.");};
 $("#clearAlerts").onclick=()=>{state.alerts=[];renderAlerts();$("#alertCount").textContent="0";toast("Event stream cleared.")};
 $$(".alert-toolbar button").forEach(b=>b.onclick=()=>{ $$(".alert-toolbar button").forEach(x=>x.classList.remove("active"));b.classList.add("active");const f=b.dataset.filter;$("#alertsFull").innerHTML=state.alerts.filter(a=>f==="all"||a.level===f).map(a=>`<div class="alert-item ${a.level}"><i class="sev"></i><div><b>${a.title}</b><p>${a.msg}</p></div><time>${a.time}</time></div>`).join("")||`<div class="report-empty">No ${f} events.</div>`});
 $("#alertBell").onclick=()=>showSection("alerts");
}
function init(){
 bind();overviewMap=initMap("overviewMap");mainMap=initMap("mainMap");buildNodeCards();initCharts();renderAodv();drawPartition();renderTech();renderMetrics();renderAlerts();
 setInterval(()=>$("#clock").textContent=now(),1000);$("#clock").textContent=now();
 // Initial events
 setTimeout(()=>addAlert("warning","FIXED NETWORK DEGRADED","Storm damage reported across fixed tower and fibre segments."),600);
 setTimeout(()=>addAlert("info","RESPONSE TEAM READY","Emergency communication console initialized for disaster response."),1300);
}
init();
