(() => {
  'use strict';
  const cols = [
    ['price','港幣參考價',190,'基本資料',true],['load','小朋友承重',130,'基本資料',true],['weight','公布車重',205,'基本資料',true],
    ['seatWidth','座位闊度',185,'乘坐空間',true],['seatHeight','座椅離地高度',185,'乘坐空間',true],['backrestHeight','靠背長度／高度',195,'乘坐空間',true],
    ['recline','靠背調節',235,'座椅調節'],['calf','腿托／腳踏',195,'座椅調節'],['direction','座椅方向',185,'座椅調節'],['structure','座椅結構',220,'座椅調節'],
    ['suspension','避震配置',220,'推行與收納'],['wheels','前／後輪',180,'推行與收納'],['folded','收摺尺寸',205,'推行與收納'],['unfolded','展開尺寸',205,'推行與收納'],['basket','購物籃承重',165,'推行與收納'],
    ['ergonomic','腰背承托評價',295,'賣點與配套'],['strengths','獨特賣點',260,'賣點與配套'],['limits','限制／版本提醒',280,'賣點與配套'],['included','隨車配件',220,'賣點與配套'],['warranty','保養',230,'賣點與配套']
  ].map(([key,label,width,group,numeric])=>({key,label,width,group,numeric}));
  const data = window.STROLLER_DATA || [];
  const sources = window.SOURCES || {};
  const $ = id => document.getElementById(id);
  const selected = new Set(data.map(m=>m.id));
  const groups = [...new Set(cols.map(c=>c.group))];
  const statusNames={user:'你提供',reference:'參考／有差異',unknown:'待確認',verified:'公開資料'};
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function renderHead(){
    $('comparison-table').style.width='calc(var(--first-col) + '+cols.reduce((sum,c)=>sum+c.width,0)+'px)';const cg=$('table-cols');cg.replaceChildren();const namecol=document.createElement('col');namecol.style.width='var(--first-col)';cg.append(namecol);
    cols.forEach(c=>{const x=document.createElement('col');x.style.width=c.width+'px';cg.append(x);});
    const g=el('tr','group-row'),l=el('tr','label-row');const n=el('th','name-heading','BB車款');n.rowSpan=2;n.scope='col';n.append(el('span','lock','⌁'),el('small','','向右捲動，車名保持可見'));g.append(n);
    groups.forEach(group=>{const th=el('th','',group);th.colSpan=cols.filter(c=>c.group===group).length;th.scope='colgroup';g.append(th);});
    cols.forEach(c=>{const th=el('th','',c.label);th.dataset.key=c.key;th.scope='col';l.append(th);});$('table-head').replaceChildren(g,l);
    const nav=document.querySelector('.group-tabs');groups.forEach((name,index)=>{const b=el('button',index===0?'active':'',name);b.type='button';b.dataset.group=name;b.addEventListener('click',()=>jumpToGroup(name));nav.append(b);});
  }
  function renderFilters(){const list=$('model-filters');data.forEach(m=>{const label=el('label','model-option');const input=document.createElement('input');input.type='checkbox';input.checked=true;input.value=m.id;input.addEventListener('change',()=>{input.checked?selected.add(m.id):selected.delete(m.id);render();});label.append(input,el('span','',m.name));list.append(label);});}
  function currentModels(){const q=$('search').value.trim().toLowerCase();let models=data.filter(m=>selected.has(m.id)&&[m.name,m.brand,m.version].join(' ').toLowerCase().includes(q));const order=$('sort').value;if(order!=='default'){models=[...models].sort((a,b)=>{const x=a.fields[order]?.number,y=b.fields[order]?.number;const xv=typeof x==='number'&&Number.isFinite(x),yv=typeof y==='number'&&Number.isFinite(y);if(!xv)return yv?1:0;if(!yv)return -1;return (order==='seatHeight'||order==='seatWidth')?y-x:x-y;});}return models;}
  function render(){
    const rows=currentModels(),body=$('table-body');body.replaceChildren();rows.forEach(m=>{const tr=document.createElement('tr');const name=el('th','model-cell');name.scope='row';name.append(el('div','model-brand',m.brand),el('div','model-title',m.name),el('div','model-version',m.version),el('span','model-number',String(data.findIndex(x=>x.id===m.id)+1).padStart(2,'0')));tr.append(name);
      cols.forEach((c,i)=>{const cell=m.fields[c.key]||{value:'未公布',status:'unknown',sources:[]};const td=el('td',`${c.numeric?'numeric ':''}${i===0||cols[i-1].group!==c.group?'group-start':''}`);const top=el('div','cell-top'),value=el('div','cell-value',cell.value);const b=el('button','info-button','i');b.type='button';b.setAttribute('aria-label',m.name+'：'+c.label+'，查看來源及備註');b.addEventListener('click',()=>showDetail(m,c,cell));top.append(value,b);td.append(top);if(cell.detail)td.append(el('div','cell-detail',cell.detail));if(cell.status&&cell.status!=='verified'){const tag=el('div','cell-status');tag.append(el('span','pill '+cell.status,statusNames[cell.status]||cell.status));td.append(tag);}tr.append(td);});body.append(tr);
    });$('model-count').textContent=rows.length;$('result-count').textContent=`顯示 ${rows.length} / ${data.length} 款 · ${cols.length} 項規格`;$('empty-state').hidden=rows.length>0;$('comparison-table').hidden=rows.length===0;syncWidth();
  }
  function showDetail(m,c,cell){$('detail-model').textContent=m.name+' · '+m.version;$('detail-title').textContent=c.label;$('detail-value').textContent=cell.value;$('detail-note').replaceChildren();if(cell.status)$('detail-note').append(el('span','pill '+cell.status,statusNames[cell.status]));if(cell.detail)$('detail-note').append(el('p','',cell.detail));const source=$('detail-source');source.replaceChildren(el('h3','','資料來源'));
    if(cell.status==='user')source.append(el('p','','你於2026年10月25日提供嘅數據；本表按你補充更新，未當作獨立實測。'));
    let count=0;(cell.sources||[]).forEach(id=>{const s=sources[id];if(!s)return;if(s.url){const a=el('a','',s.title+' ↗');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';source.append(a);count++;}else if(s.title&&cell.status!=='user'){source.append(el('p','',s.title));count++;}});if(!count&&cell.status!=='user')source.append(el('p','','未找到對應版本嘅可靠公開數據；以實物、隨車說明書及商戶確認為準。'));$('detail-dialog').showModal();
  }
  function syncWidth(){requestAnimationFrame(()=>{$('scroll-spacer').style.width=$('comparison-table').hidden?'0px':Math.max(0,$('comparison-table').scrollWidth-20)+'px';updateScroll();updatePageHeader();});}
  function updateScroll(){const sc=$('table-scroll');const max=Math.max(0,sc.scrollWidth-sc.clientWidth);$('scroll-left').disabled=sc.scrollLeft<2;$('scroll-right').disabled=sc.scrollLeft>=max-2;let offset=0,active=groups[0];for(const group of groups){if(sc.scrollLeft+50>=offset)active=group;offset+=cols.filter(c=>c.group===group).reduce((s,c)=>s+c.width,0);}document.querySelectorAll('.group-tabs button').forEach(b=>{const on=b.dataset.group===active;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'true':'false');});$('position-label').textContent=max>0?`${active} · 左右捲動睇全部規格 ↔`:'全部規格';}
  // Keep the original table header visible while the page (not the table) scrolls.
  let headerFrame=0;
  function updatePageHeader(){
    if(headerFrame)return;
    headerFrame=requestAnimationFrame(()=>{
      headerFrame=0;
      const table=$('comparison-table'),head=$('table-head');
      if(table.hidden){head.style.removeProperty('--table-head-offset');return;}
      const top=table.getBoundingClientRect().top;
      const barHeight=$('table-navigation-wrap').getBoundingClientRect().height;
      const max=Math.max(0,table.offsetHeight-head.offsetHeight);
      head.style.setProperty('--table-head-offset',Math.min(max,Math.max(0,barHeight-top))+'px');
    });
  }
  function jumpToGroup(group){let x=0;for(const c of cols){if(c.group===group)break;x+=c.width;}$('table-scroll').scrollTo({left:x,behavior:'instant'});}
  let syncing=false;function mirror(from,to){if(syncing)return;syncing=true;const maxFrom=from.scrollWidth-from.clientWidth,maxTo=to.scrollWidth-to.clientWidth;const target=maxFrom>0?from.scrollLeft/maxFrom*Math.max(0,maxTo):0;if(Math.abs(to.scrollLeft-target)>1)to.scrollLeft=target;syncing=false;}
  $('table-scroll').addEventListener('scroll',()=>{mirror($('table-scroll'),$('top-scroll'));updateScroll();});$('top-scroll').addEventListener('scroll',()=>mirror($('top-scroll'),$('table-scroll')));
  $('scroll-left').addEventListener('click',()=>$('table-scroll').scrollBy({left:-Math.max(300,$('table-scroll').clientWidth-240),behavior:'instant'}));$('scroll-right').addEventListener('click',()=>$('table-scroll').scrollBy({left:Math.max(300,$('table-scroll').clientWidth-240),behavior:'instant'}));
  $('filter-trigger').addEventListener('click',()=>{const p=$('filter-panel');p.hidden=!p.hidden;$('filter-trigger').setAttribute('aria-expanded',String(!p.hidden));});
  function selectAll(){data.forEach(m=>selected.add(m.id));document.querySelectorAll('.model-option input').forEach(i=>i.checked=true);render();}
  $('select-all').addEventListener('click',selectAll);$('reset-filters').addEventListener('click',()=>{$('search').value='';selectAll();});$('search').addEventListener('input',render);$('sort').addEventListener('change',render);$('close-detail').addEventListener('click',()=>$('detail-dialog').close());$('detail-done').addEventListener('click',()=>$('detail-dialog').close());$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  window.addEventListener('resize',syncWidth);window.addEventListener('scroll',updatePageHeader,{passive:true});renderHead();renderFilters();render();
  if('ResizeObserver' in window){const layoutObserver=new ResizeObserver(updatePageHeader);layoutObserver.observe($('table-navigation-wrap'));layoutObserver.observe($('comparison-table'));}
})();
