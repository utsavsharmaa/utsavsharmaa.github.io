const screen = document.querySelector('#screen');
const workspace = document.querySelector('.workspace');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector('#dialog');
const history = [];
const places = [
  { name: 'Bhandardara', photo: 'BhandardaraLake', desc: 'Lake, waterfalls and camping · 170 km', estimate: 10000, time: '3.5 h', crowd: 'Low crowd' },
  { name: 'Lonavala', photo: 'Lonavala', desc: 'Forts, valleys and food stops', estimate: 9800, time: '1.5 h', crowd: 'High crowd' },
  { name: 'Mahabaleshwar', photo: 'Mahabaleshwar', desc: 'Viewpoints, strawberries and forest walks', estimate: 14200, time: '3 h', crowd: 'High crowd' }
];
const initial = () => ({
  page:'home', request:'Show me the best I can do for ₹15K this weekend', budget:15000,
  scope:'Whole trip', group:'2 of us', city:'Pune', food:'Non-veg', mode:'Bike',
  date:'Fri 20–Sun 22 Nov', place:0, room:'Lake-view tent', property:'Lakeview Camps',
  gallery:'Guest photos (48)', foodFilter:'Non-veg', meals:2400, extra:0, priceDelta:0,
  booked:false, scenario:'', reelType:'This trek', fitness:'We walk a lot', crowd:false,
  activity:'Kayaking at Arthur Lake', activityDay:2, skippedMeal:false, planType:'', comparing:false
});
let s = initial();
let timer;
let screenAnimation;
let actionSource;
const rupees = n => '₹' + new Intl.NumberFormat('en-IN').format(n);
const escape = str => String(str).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const photo = (name, alt, cls='hero') => `<img class="${cls}" src="assets/imgPhoto${name}.jpg" alt="${escape(alt)}">`;
const artwork = (name,alt='') => `<img src="assets/img${name}.png" alt="${escape(alt)}">`;
const icon = name => `<img class="ui-icon" src="assets/img${name}.svg" alt="">`;
const currentPlace = () => places[s.place];
const people = () => ({'Just me':1,'2 of us':2,'3 or more':4,'3 people':3}[s.group] ?? 2);
const limit = () => s.budget * (s.scope === 'Per person' ? people() : 1);
const transport = () => ({Bike:1800,Car:4600,Train:2200,Bus:2400}[s.mode]);
const roomCost = () => ({'Lake-view tent':4000,Cottage:7600,'Cottage Friday, tent Saturday':5400,'Budget homestay':3200,'Lakeside cottage':6800}[s.room] ?? 4000);
const costs = () => {
  const day = s.planType === 'day';
  const stay = day ? 0 : roomCost() + s.priceDelta + s.extra;
  const travel = day ? 5200 : s.planType === 'tents' ? 4800 : transport();
  const food = day ? 2200 : Math.max(0,s.meals-(s.skippedMeal?450:0));
  const fun = s.activity === 'Kayaking at Arthur Lake' ? 800 : s.activity === 'Bhutta and chai by the dam' ? 150 : s.activity === 'Cosy afternoon at the cottage' ? 300 : 0;
  const buffer = day ? 1000 : s.planType === 'tents' ? 2600 : 1000;
  return {stay,travel,food,fun,buffer,total:stay+travel+food+fun+buffer};
};
const button = (label, action, cls='secondary', data='') => `<button class="${cls}" data-action="${action}" ${data}>${escape(label)}</button>`;
const go = (label,page,cls='secondary') => button(label,'go',cls,`data-page="${page}"`);
const valueIcons = {'Whole trip':'IconWallet','Per person':'IconUsers','Just me':'IconUsers','2 of us':'IconUsers','3 or more':'IconUsers',Bike:'IconBike',Car:'IconCar',Veg:'VegMark','Non-veg':'NonVegMark',Train:'IconCar',Bus:'IconCar'};
const choose = (key,value,label=value) => {
  const image = key==='city'?'IconPin':valueIcons[value];
  return `<button class="pill" data-action="choose" data-key="${key}" data-value="${escape(value)}" aria-pressed="${s[key]===value}">${value==='Both'?icon('VegMark')+icon('NonVegMark'):image?icon(image):''}${escape(label)}</button>`;
};
const group = (title,key,options) => `<fieldset class="group"><legend>${({scope:icon("IconWallet"),group:icon("IconUsers"),food:icon("VegMark"),mode:icon("IconCar")})[key]??""}${escape(title)}</legend><div class="chips">${options.map(x=>choose(key,x)).join('')}</div></fieldset>`;
const reply = message => `<div class="reply"><span class="reply-mark" aria-hidden="true">${icon("AiSparkles")}</span><p>${escape(message)}</p></div>`;
const bubble = message => `<p class="bubble">${escape(message)}</p>`;
const card = html => `<section class="card">${html}</section>`;
const tag = value => `<span class="tag">${escape(value)}</span>`;
const list = items => `<ul class="list">${items.map(x=>`<li>${escape(x)}</li>`).join('')}</ul>`;
const row = (title, detail, price='', image='') => `<div class="rowcard"><div><strong>${escape(title)}</strong><p class="muted">${escape(detail)}</p></div>${price?`<div class="price">${escape(price)}</div>`:''}${image?photo(image,title,''):''}</div>`;
const primary = (label,action) => button(label,action,'primary wide');
const balance = total => total <= limit() ? `${rupees(limit()-total)} under budget` : `${rupees(total-limit())} over budget`;
const context = (from=false) => `<div class="trip-context">${[[from?`From ${s.city}`:currentPlace().name,'IconPin'],[s.date,'IconCalendar'],[`${people()} people`,'IconUsers'],[rupees(limit()),'IconWallet'],[s.mode,'IconBike']].map(([text,image])=>`<span>${icon(image)}${escape(text)}</span>`).join('')}</div>`;
const destination = index => button('Explore '+places[index].name,'place','primary wide',`data-index="${index}"`);
const scenarios = {'home':'Cleartrip home','ask':'₹15K weekend','reel':'Start from a reel','reelError':'Reel can’t be read','noBudget':'Nothing fits the budget','over':'Car + cottage trade-off','price':'Price changed or sold out','change':'Change after booking','weather':'Disruption during the trip'};
function move(page) {
  clearTimeout(timer);
  if(s.page===page) {render();return;}
  if(s.page!=='planning') history.push({state:{...s},scrollTop:workspace.scrollTop});
  s.page=page;
  render('forward');
  if(page==='planning') advancePlanning(1);
}
const planningSteps = [
  ['Looking for places within 4 hours','Filtering for your dates and group'],
  ['Checking the weather','Looking for rain alerts and clear days'],
  ['Comparing stays for the weekend','Checking prices and guest reviews'],
  ['Pricing travel, food and activities','Adding the costs you pay on the trip'],
  ['Putting your options together','Checking the total against your budget']
];
function advancePlanning(step) {
  if(s.page!=='planning') return;
  screen.querySelector('progress').value=step;
  screen.querySelector('#planning-step').textContent=`${step} of ${planningSteps.length}`;
  screen.querySelectorAll('.planning-list li').forEach((item,i)=>{
    item.dataset.phase=i<step-1?'complete':i===step-1?'active':'pending';
    item.querySelector('i').textContent=i<step-1?'✓':i===step-1?'⟳':'';
  });
  timer=setTimeout(()=>{
    if(step<planningSteps.length) advancePlanning(step+1);
    else move(people()>=4 && limit()<18000 && !s.planType?'noBudget':'pick');
  },step===planningSteps.length?320:460);
}
function start(page) {
  clearTimeout(timer);
  history.length = 0;
  s = initial();
  if (['over','price','change','weather'].includes(page)) {
    s.mode='Car'; s.room=page==='over'?'Cottage':'Cottage Friday, tent Saturday';
    if(page==='price') s.priceDelta=-600;
  }
  if (page==='noBudget') s.group='3 or more';
  if (['change','weather'].includes(page)) s.booked=true;
  s.page=page;
  render('forward');
}
function modal(title, content) {
  document.querySelector('#dialog-body').innerHTML = `<h2 id="dialog-title">${escape(title)}</h2>${content}`;
  document.querySelector('#scenarios').hidden=true;
  if(!dialog.open) dialog.showModal();
}
const pageViews = {
  home: () => `<button class="home-search" data-action="begin">${icon('AiSparkles')}<span>Explore your next adventure with AI</span>${icon('SearchIcon')}</button>
    <div class="services">${['Hotels','Flights','Trains','Buses','Holidays'].map((x,i)=>`<button class="service" data-action="service" data-value="${x}" aria-label="${x}">
      ${i===0?'<span class="service-badge">Book at 0</span>':i===4?'<span class="service-badge">NEW</span>':''}
      <span class="service-art">${artwork('Illustration'+x)}</span><strong>Hotels</strong><small>30-80% off</small>
      ${i===0?'<span class="service-discount">1st stay: Flat 25% off</span>':''}</button>`).join('')}</div>
    <button class="home-promo" data-action="service" data-value="Flights" aria-label="Epic Year End Sale, up to 25% off on flights"><img src="assets/imgAirplaneWindowPhotographAndSaleBranding.jpg" alt=""></button>
    <div class="home-pagination" aria-hidden="true">${'<span></span>'.repeat(7)}</div>
    <div class="home-offers">
      <button data-action="homeInfo" data-value="Wedding store"><small>Wedding store</small><strong>Up to ₹5000 off</strong><span>on Flights</span>${artwork('WeddingDestinationPhotograph')}</button>
      <button data-action="homeInfo" data-value="Brand of the day"><small>Brand of the day</small><strong class="bloom-wordmark">bloom</strong><strong>Up to ₹5000 off</strong>${artwork('BloomPropertyPhotograph')}</button>
      <button data-action="homeInfo" data-value="Beyond appliances" aria-label="Beyond appliances">${artwork('BeyondCampaignArtwork')}</button>
    </div>`,
  ask: () => bubble(s.request)+reply(`${s.budget%1000===0?'₹'+s.budget/1000+'K':rupees(s.budget)} this weekend, let's make it count. 5 quick taps so I can plan it right.`)+`<div class="chat-indent ask-options">${card(
    group(`${s.budget%1000===0?'₹'+s.budget/1000+'K':rupees(s.budget)} is for`,'scope',['Whole trip','Per person'])+
    group("Who's going?",'group',['Just me','2 of us','3 or more'])+
    `<fieldset class="group"><legend>${icon('IconPin')}Leaving from</legend><div class="chips">${choose('city',s.city)}<button class="pill" data-action="city">${icon('IconPen')}Change</button></div></fieldset>`+
    group('Food','food',['Veg','Non-veg','Both'])+group('Getting there','mode',['Bike','Car','Train','Bus'])+
    `<button class="primary wide" data-action="plan">${icon('AiSparkles')}Plan my weekend</button>`)}</div>`,
  planning: () => bubble(s.request)+reply('On it. I’m checking what fits your weekend.')+`<div class="chat-indent">`+card(
    `<div class="split-line"><h3>Planning your weekend</h3><span id="planning-step" aria-live="polite">1 of 5</span></div><progress aria-label="Planning progress" value="1" max="5"></progress>
    <ol class="planning-list">${planningSteps.map(([title,detail])=>`<li data-phase="pending"><i aria-hidden="true"></i><div>${escape(title)}<small>${detail}</small></div></li>`).join('')}</ol>`)+
    '<div class="skeleton" aria-hidden="true"><i></i><b></b><b></b><b></b></div><div class="skeleton" aria-hidden="true"><i></i><b></b><b></b><b></b></div>'+button('Stop','stop')+' <small class="inline">You can keep typing while I plan</small></div>',
  pick: () => {
    const index=s.crowd?1:0;
    const p=places[index];
    const choices=places.map((x,i)=>`<button class="destination-tile" data-action="place" data-index="${i}" aria-label="Explore ${x.name}">
      <div class="hero-wrap">${photo(x.photo,x.name)}<strong>${x.name}</strong></div>
      <div class="tile-meta"><b>${rupees(x.estimate)}</b> · ${x.time}<br><span class="crowd-tag ${x.crowd==='Low crowd'?'low':'high'}">${x.crowd}</span></div></button>`);
    return context(true)+reply(s.comparing?'Here’s how all three compare.':`3 places fit your ${s.budget%1000===0?'₹'+s.budget/1000+'K':rupees(s.budget)}. My pick first.`)+
      (s.comparing?`<div class="destination-grid">${choices.join('')}</div>`:
      `<section class="destination-main"><div class="hero-wrap">${photo(p.photo,p.name)}<span class="best-label">${icon('AiSparkles')} Best for you</span><div class="hero-caption"><h2>${p.name}</h2><p>${p.desc}</p></div></div>
      <div class="destination-body"><div class="stats"><div>${icon('IconWallet')} <strong>${rupees(p.estimate)}</strong><small class="green-text">${rupees(Math.max(0,limit()-p.estimate))} left</small></div><div>${icon('IconBike')} <strong>${p.time}</strong><small>Scenic ghat ride</small></div><div>${icon('IconSun')} <strong>16–27°</strong><small>Clear skies</small></div></div>
      <span class="crowd-tag ${p.crowd==='Low crowd'?'low':'high'}">${p.crowd}</span> <small class="inline">Fri–Sat, after the monsoon rush</small><p class="destination-reason">${icon('AiSparkles')} ${p.name==='Bhandardara'?'Quiet lakes, an easy ride, and money left for kayaking.':'Shorter travel leaves more time at the destination.'}</p>
      ${destination(index)}</div></section><h3 class="section-label">Also fits</h3><div class="destination-grid">${choices.filter((_,i)=>i!==index).join('')}</div>`)+
      `<div class="chips">${button(s.comparing?'Show my pick':'Compare all 3','compare')}${button('Somewhere new','rotate')}${go('Cheaper options','noBudget')}</div>`;
  },
  place: () => {
    const p=currentPlace();
    const activities=[['Kayaking at Arthur Lake','KayakingOnArthurLake','₹800 for 2'],['Randha Falls viewpoint','RandhaFalls','Free'],['Kalsubai sunrise trek','KalsubaiSunriseTrek','₹400'],['Stargazing at camp','StargazingAtCamp','Free']];
    return `<div class="place-cover">${photo(s.place===0?'BhandardaraHero':p.photo,p.name)}<span>1 / 12 guest photos</span></div><section class="place-body"><h1>${p.name}</h1><p class="muted">${icon('IconPin')} ${p.desc} · From ${escape(s.city)}</p>`+
      ['Lake','Waterfalls','Camping','Stargazing'].map(tag).join('')+
      `<p class="place-intro">${s.place===0?'A quiet lake town in the Sahyadri hills. November is the sweet spot: the falls still flow, nights are cool, and the monsoon crowds are gone.':escape(p.desc)+'.'}</p>
      <div class="stats">${[['IconSun','27°','Daytime'],['IconMoon','15°','Night, pack a jacket'],['IconClock','5:55 pm','Sunset at the lake']].map(([image,temp,label])=>`<div>${icon(image)} <strong>${temp}</strong><small>${label}</small></div>`).join('')}</div><h3 class="section-label">When to go</h3>`+
      card('<h3>Crowd and tent price, this week</h3><div class="date-chart">'+[['Thu',1600,'Low','Thu 19–Sat 21 Nov'],['Fri',1800,'Low','Fri 20–Sun 22 Nov'],['Sat',2200,'High','Sat 21–Mon 23 Nov'],['Sun',1900,'Medium','Sun 22–Tue 24 Nov']].map(([day,price,crowd,date],i)=>`<button class="chart-day" data-action="choose" data-key="date" data-value="${date}" aria-pressed="${s.date===date}"><strong>${rupees(price)}</strong><i class="bar-${i}"></i>${day}<small>${crowd}</small></button>`).join('')+'</div><div class="notice good">Arrive Friday: fewer people and ₹400 less a night than Saturday.</div>')+
      '<h3 class="section-label">Things to do</h3><div class="activity-strip">'+activities.map(([name,image,price])=>`<button class="activity-card" data-action="choose" data-key="activity" data-value="${name}" aria-pressed="${s.activity===name}">${photo(image,name)}<strong>${name}</strong><small>${price}${s.activity===name?' · ✓ Added':''}</small></button>`).join('')+'</div><div class="notice info">Some activities are paid on the spot. They’re included in your trip budget.</div>'+
      go('Check stays','stay','primary wide')+'</section>';
  },
  stay: () => `${tag('✓ Book on Cleartrip')}<h1>${escape(s.property)}</h1><p><span class="rating">4.3 ★</span> <span class="muted">212 reviews · 600 m from Arthur Lake</span></p><p><span class="green-tag">✓ Breakfast and dinner included</span></p>
    <div class="gallery-tabs">${choose('gallery','Guest photos (48)')}${choose('gallery','Hotel photos (12)')}</div>
    ${photo(s.gallery.startsWith('Guest')?'GuestTentByTheLake':'GuestLakeAtSunrise',s.gallery)}
    <div class="gallery-thumbs">${['GuestTentInside','GuestWashroom','GuestLakeAtSunrise'].map((x,i)=>`<button data-action="photo" data-photo="${x}" aria-label="Open stay photo ${i+1}">${photo(x,['Inside the tent','Washroom','Lake sunrise'][i])}</button>`).join('')}</div><small>Shot by guests in Oct–Nov 2026</small>`+
    `<div class="notice"><strong>Photos vs reality</strong><p>9 guests say tents are smaller than the hotel’s photos. Lake view only from tents 1 to 6, so ask for one.</p></div><h3 class="section-label">What guests say</h3><div class="review-pair"><div class="notice good"><h3>Loved</h3>${list(['Clean washrooms · 58','Bonfire and food · 41','Friendly staff · 37'])}</div><div class="notice bad"><h3>Complaints</h3>${list(['Hot water only mornings · 22','Weak phone signal · 18','Rough last 2 km · 15'])}</div></div>`+
    '<h3 class="section-label">Pick a room</h3><div class="room-grid">'+(s.property==='Lakeview Camps'?['Lake-view tent','Cottage']:['Budget homestay','Lakeside cottage']).map((room,i)=>`<button data-action="choose" data-key="room" data-value="${room}" aria-pressed="${s.room===room}"><span>${room}</span><strong>${rupees(s.property==='Lakeview Camps'?[4000,7600][i]:[3200,6800][i])}</strong><small>2 nights for 2 · taxes incl.</small></button>`).join('')+'</div>'+
    card('<h3>The fine print, in plain words</h3>'+list(['Hot water 6–9 am only','No outside food or alcohol','Check-in 1 pm · check-out 10 am','Government ID needed for every guest'])+button('Read the house rules','rules')+' '+go('2 other stays','stays'))+primary(`Choose stay · ${rupees(roomCost())}`,'stayNext'),
  stays: () => '<h1>Other stays</h1>'+[['Budget homestay','Simpler rooms, no included meals',3200],['Lakeside cottage','More space, quieter location',6800],['Lakeview Camps','Guest photos and two included meals per day',4000]].map(([name,detail,price])=>card(row(name,detail,rupees(price))+button('Inspect '+name,'property','primary',`data-value="${name}"`))).join(''),
  food: () => context()+bubble('Where should we eat?')+reply('Picked for '+s.foodFilter.toLowerCase()+', with other options marked too. Here’s each stop.')+
    `<div class="chips">${['Non-veg','Veg','All'].map(x=>choose('foodFilter',x)).join('')}</div>
    <div class="notice good"><strong>4 meals are already in your stay</strong><div class="included-meals">${['Fri · Dinner','Sat · Breakfast','Sat · Dinner','Sun · Breakfast'].map(x=>`<span>✓ ${x}</span>`).join('')}</div><small>At your stay’s kitchen. Below are picks for the other meals.</small></div>
    <h3>On the way · Lonavala</h3>`+
    row('Highway Misal House','Try: Misal pav and kanda bhaji · 4.4 ★','₹250','HighwayMisalHouse')+
    '<h3>At Bhandardara</h3>'+
    (s.foodFilter==='Veg'?'':row('Lakeside Dhaba','Try: Chicken sukka with jowar bhakri · 4.2 ★','₹600','LakesideDhaba'))+
    row('Camp kitchen','Try: Pithla bhakri, a local classic · 4.0 ★','Included','CampKitchen')+
    '<h3 class="section-label">Local must-try</h3><div class="food-strip">'+[['Pithla bhakri','CampKitchen'],['Masala chaas','MasalaChaas'],['Roasted bhutta','RoastedBhutta']].map(([name,image])=>`<div>${photo(image,name)}<small>${icon('VegMark')} ${name}</small></div>`).join('')+'</div>'+
    '<div class="notice">Most places shut by 9:30 pm. Plan dinner early on Saturday.</div><div class="notice info">Other meals are paid as you go, on the trip.</div>'+
    '<div class="actions">'+button(s.skippedMeal?'Restore lunch stop':'Skip lunch stop','meal')+button('Swap food stop','foodSwap')+'</div>'+
    card(group('Transport','mode',['Bike','Car','Train','Bus'])+group('Stay','room',['Lake-view tent','Cottage','Cottage Friday, tent Saturday'])+`<p>Estimated total <strong>${rupees(costs().total)}</strong></p>`+primary('See my itinerary','foodNext')),
  over: () => {
    const c=costs();
    return bubble('Can we take a car instead, and stay in the cottage?')+reply(c.total>limit()?'That goes over your budget. Here’s what you could trade.':'This is within your budget. You can still compare trade-offs.')+
    card(`<h2>New total</h2><p class="total">${rupees(c.total)}</p>${tag(balance(c.total))}`+list([`Transport ${rupees(c.travel)}`,`Stay ${rupees(c.stay)}`,`Food ${rupees(c.food)}`,`Activities and buffer ${rupees(c.fun+c.buffer)}`]))+
    card(row('Cottage Friday, tent Saturday','One cosy night. Lower cost on Saturday.','−₹2,200')+button('Choose split stay','split','primary'))+
    card(row('Ride the bike, skip the car','A longer ride for less.','−₹2,800')+button('Switch to bike','bike'))+
    card(row('Keep car and cottage','Increase the budget to cover the trip.')+button('Change budget','budget'));
  },
  reel: () => photo('ReelKalsubaiSunrise','Sunrise from Kalsubai')+reply('This looks like Kalsubai near Bhandardara. It’s a night trek with steep iron ladders near the top.')+
    card(group('This exact trek, or just the vibe?','reelType',['This trek','Something easier'])+
      group('When?','date',['Fri 20–Sun 22 Nov','Next weekend'])+group('Who’s going?','group',['Just me','2 of us','3 or more'])+
      group('How fit are you?','fitness',['We walk a lot','We trek often'])+primary('✧  Plan this trip','reelPlan')),
  reelError: () => reply('I couldn’t tell where this is. The reel has no location tag and the caption doesn’t name a place.')+
    card('<h2>What I could see</h2>'+['Tall waterfall','Rocky river','Green hills','Monsoon'].map(tag).join('')+
      '<p>Know the place? Type it below, or choose a similar destination.</p>'+places.map((x,i)=>destination(i)).join('')+
      button('Paste another link','focus')),
  noBudget: () => reply('The full plan doesn’t fit this budget. Here are two ways to make the weekend work.')+
    card(`<h2>Cheapest full plan for ${people()}</h2><p class="total">${rupees(people()>=4?21600:Math.max(13600,limit()+1400))}</p><p>Weekend stays and transport account for most of the gap.</p>`)+
    card(row('Day trip on Sunday','Lake, falls and kayaking. Go home the same evening.','₹9,200')+button('Build day trip','day','primary'))+
    card(row('Tents both nights + 2 bikes','Keep two nights with a simpler stay.','₹14,600')+button('Build tent trip','tents'))+
    button('Change budget','budget')+' '+go('Change dates','ask'),
  itinerary: () => {
    const c=costs();const day=s.planType==='day';
    return `<h1>${currentPlace().name}, ${day?'1 day':'3 days'}</h1>${context()}${tag(rupees(c.total)+' total')}${tag(day?'Pay there':'Book on Cleartrip + pay there')}`+
      card(`<h2>${day?'Sunday · Day trip':'Day 1 · Arrive and settle in'}</h2>`+
        row('6:30 am · Leave '+s.city,s.mode+' · Arrange yourself',rupees(c.travel))+
        (!s.skippedMeal?row('8:30 am · Highway Misal House','Breakfast stop · Pay there','₹250'):'')+
        (day?'':row('1:00 pm · Check in at '+s.property,s.room+' · '+(s.booked?'Booked on Cleartrip':'Book on Cleartrip'),rupees(c.stay)))+
        (day?row('11:00 am · '+s.activity,'Pay there',rupees(c.fun))+row('6:00 pm · Return to '+s.city,'Allow time for traffic'):'')+
        go('Edit food or transport','food'))+
      (day?'':card('<h2>Day 2 · Lake and viewpoints</h2>'+(s.activityDay===2?row('11:00 am · '+s.activity,'Local activity',rupees(c.fun)):'')+go('Swap activity','place'))+
      card('<h2>Day 3 · A slow morning</h2>'+row('8:30 am · Breakfast','Included in stay')+(s.activityDay===3?row('9:30 am · '+s.activity,'Local activity',rupees(c.fun)):'')+row('11:00 am · Drive home','Check out before leaving')))+
      (s.booked?go('Manage booking','change','primary wide'):go('Review before booking','review','primary wide'));
  },
  review: () => {
    const c=costs(), p=currentPlace();
    const outside=c.total-c.stay;
    return `<section class="review-summary"><div class="hero-wrap">${photo(p.photo,p.name)}<div class="hero-caption"><h2>${p.name}</h2><p>${escape(s.date)} · ${people()} people · by ${s.mode.toLowerCase()}</p></div></div>
      <div class="review-totals"><small>Whole trip</small><div class="split-line"><strong class="total">${rupees(c.total)}</strong>${tag(balance(c.total))}</div><progress max="${Math.max(c.total,limit())}" value="${c.total}" aria-label="Trip cost versus budget"></progress>
      <div class="review-legend"><span>Pay now on Cleartrip ${rupees(c.stay)}</span><span>On the trip ${rupees(outside)}</span></div></div></section>`+
      (c.stay?`<section class="review-block book-block"><div class="split-line"><div><h3>Book on Cleartrip</h3><small>Pay now</small></div><strong>${rupees(c.stay)}</strong></div>${row(s.property,s.room+' · '+people()+' guests',rupees(c.stay))}${tag('Free cancellation')}${button('House rules','rules','quiet-chip')}${go('Edit stay','stay','quiet-chip')}</section>`:'')+
      `<section class="review-block arrange-block"><div class="split-line"><div><h3>Arrange yourself</h3><small>Cleartrip can’t book these. Pay on the trip.</small></div><strong>${rupees(outside)}</strong></div>${row(s.mode==='Car'?'Self-drive car':s.mode,'Transport from '+s.city,rupees(c.travel))}${row(s.activity,'Pay on the trip',rupees(c.fun))}${row('Food, 2 days','Lunches and snacks',rupees(c.food))}${row('Buffer','For surprises on the road. Yours if unused.',rupees(c.buffer))}${go('Edit itinerary','itinerary','quiet-chip')}</section>`+
      '<div class="notice"><strong>3 things to know before you pay</strong>'+list(['Hot water 6–9 am only','No outside alcohol at the camp','Last 2 km is a rough road, drive slow'])+'</div>'+
      (c.total>limit()?go('Review budget trade-offs','over','primary wide'):
        primary(c.stay?`Confirm demo payment · ${rupees(c.stay)}`:'Confirm day-trip plan','confirm'));
  },
  booked: () => `<div class="notice good"><h1>${currentPlace().name} ${costs().stay?'trip is booked':'day trip is ready'}</h1><p>Demo reference CT-48213 · ${escape(s.date)}</p></div>`+
    card(`<h2>What’s next</h2><p>Arrange transport and keep ${rupees(costs().total-costs().stay)} for the trip.</p>`+go('View your itinerary','itinerary','primary'))+
    `<div class="chips">${go('Change booking','change')}${go('See a trip disruption','weather')}${button('Share trip','share')}</div>`,
  change: () => `<div class="notice good"><h1>Manage your trip</h1><p>CT-48213 · ${escape(s.date)}</p></div>`+
    `<div class="chips">${button('Add a person','changeOption','secondary','data-value="person"')}${button('Change dates','changeOption','secondary','data-value="dates"')}${button('Swap stay','changeOption','secondary','data-value="stay"')}${button('Move a stop','changeOption','secondary','data-value="stop"')}</div>`+
    (s.scenario==='person'?card('<h2>What changes</h2>'+row('Stay','Extra mattress for both nights','+₹1,200')+row('Car','5 seats, so no change')+row('Food','Estimated extra meals','+₹900')+primary('Approve change · ₹1,200 due now','addPerson')):
    s.scenario==='dates'?card('<h2>Move your booking</h2><p>Demo availability for the same stay next weekend, at the same price.</p>'+primary('Confirm next weekend','changeDates')):
    s.scenario==='stay'?card('<h2>Swap your booked stay</h2><p>The cottage is available. A simulated ₹2,200 adjustment applies.</p>'+primary('Confirm cottage swap','changeStay')):
    s.scenario==='stop'?card('<h2>Move your activity</h2><p>Move the lake activity to Sunday morning. No price change.</p>'+primary('Confirm Sunday activity','changeStop')):
    go('View booked itinerary','itinerary')),
  price: () => reply(s.scenario==='sold'?'The cottage sold out before payment. Here are the available alternatives.':'Before you pay, the cottage price changed in the last 10 minutes.')+
    card(row('Lakeview Cottage','Fri · 1 night · 2 guests',s.scenario==='sold'?'Sold out':'₹3,200 → ₹3,800')+
      (s.scenario==='sold'?'':button('Accept ₹600 change','acceptPrice','primary')+' '+button('Check if it sold out','sold')))+
      card(row('Lake-view tent','Same property · cheaper alternative','₹4,000')+button('Switch to tent','switchTent'))+
      go('See other stays','stays')+' '+go('Back to itinerary','itinerary'),
  weather: () => '<div class="notice"><h1>Heavy rain, 10 am to 4 pm</h1><p>Kayaking is closed today. You planned to pay there, so there’s no refund to claim.</p></div>'+
    card('<h2>Plan B for today</h2>'+['Randha Falls viewpoint','Bhutta and chai by the dam','Cosy afternoon at the cottage'].map((x,i)=>row(x,['20 min drive','Covered stalls · 10 min drive','Bonfire and board games'][i],['Free','₹150','₹300'][i])+choose('activity',x)).join('')+primary('Update my itinerary','weatherApply'))
};
const screenHeaders = {
  place: ['',''],
  stay: ['Stay check','Stay 1 of 3 that fit your plan'],
  stays: ['Other stays','Compare options that fit your plan'],
  itinerary: ['Your trip plan','First try: tap any stop to change it.'],
  review: ['Review your trip','Check every item. Nothing is paid yet.']
};
function render(direction='', restoreScroll=0) {
  const scrollTop=workspace.scrollTop;
  const strips=[...screen.querySelectorAll('.trip-context,.activity-strip')].map(el=>el.scrollLeft);
  const home=s.page==='home';
  const special=screenHeaders[s.page];
  document.querySelector('.shell').dataset.screen=s.page;
  const brand=document.querySelector('#brand');
  if(home) brand.innerHTML=artwork('CleartripBrandArtwork','Cleartrip');
  else brand.textContent=special?.[0]??'Cleartrip AI';
  document.querySelector('#subtitle').textContent=home?'':special?.[1]??'Suggests a plan. You decide.';
  const back=document.querySelector('#back');
  back.innerHTML=icon(home?'HamburgerIcon':'IconArrowLeft');
  back.setAttribute('aria-label',home?'Open menu':'Go back');
  const reset=document.querySelector('#reset');
  reset.innerHTML=home?`<span class="coins">${artwork('SuperCoinSymbol')}55</span><span class="elite">Elite</span>`:icon(special?'IconShare':'IconPen');
  reset.setAttribute('aria-label',home?'Open demo menu':special?'Share trip':'Start again');
  const homeNav=document.querySelector('#home-nav');
  homeNav.hidden=!home;
  homeNav.innerHTML=[['Home','HomeIcon','home'],['My Trips','MyTripsIcon','trips'],['Ask AI','AiSparkles','begin'],['Work','WorkIcon','homeInfo'],['Offers','OffersIcon','homeInfo']].map(([label,image,action])=>`<button data-action="${action}" data-value="${label}"><span>${icon(image)}</span>${label}</button>`).join('');
  const footer=document.querySelector('#footer');
  footer.hidden=home || Boolean(special);
  footer.querySelector('small').textContent=s.booked?'Booked · CT-48213 · Help is open 24×7':'Nothing is booked until you review and pay.';
  document.querySelector('#message').placeholder=s.page==='planning'?'Add something while I plan…':s.page==='reelError'?'Type the place, or paste a link':'Ask anything, or paste a reel link';
  screen.innerHTML=pageViews[s.page]();
  const actions=document.querySelector('#screen-actions');
  actions.innerHTML='';
  const keyAction=({place:'[data-page=stay]',stay:'[data-action=stayNext]',itinerary:'[data-page=review], [data-page=change]',review:'[data-action=confirm], [data-page=over]'})[s.page];
  const action=keyAction?screen.querySelector(keyAction):null;
  actions.hidden=!action;
  if(action) {
    if(s.page==='place') {
      const amount=document.createElement('div');
      amount.innerHTML=`<strong>${rupees(currentPlace().estimate)} for ${people()}</strong><small>${escape(balance(currentPlace().estimate))}</small>`;
      actions.append(amount);
      action.textContent='Pick a stay ›';
    }
    if(s.page==='review' && action.dataset.action==='confirm' && costs().stay) {
      action.textContent=`Pay ${rupees(costs().stay)} securely`;
      action.setAttribute('aria-label',`Simulate paying ${rupees(costs().stay)}`);
    }
    actions.append(action);
    if(s.page==='review') actions.insertAdjacentHTML('beforeend',`<small>The other ${rupees(costs().total-costs().stay)} is paid on the trip.</small>`);
  }
  if(direction) {
    screenAnimation?.cancel();
    screen.focus({preventScroll:true});
    workspace.scrollTop=restoreScroll;
    if(!motion.matches) {
      screenAnimation=screen.animate(
        [{opacity:.45,transform:`translateY(${direction==='back'?-6:8}px)`},{opacity:1,transform:'translateY(0)'}],
        {duration:210,easing:'cubic-bezier(.2,.72,.25,1)'}
      );
    }
  } else {
    workspace.scrollTop=scrollTop;
    screen.querySelectorAll('.trip-context,.activity-strip').forEach((el,index)=>{el.scrollLeft=strips[index]??0;});
    if(actionSource && !actionSource.isConnected) {
      const replacement=[...screen.querySelectorAll('[data-action]')].find(el=>
        Object.entries(actionSource.dataset).every(([key,value])=>el.dataset[key]===value)
      );
      replacement?.focus({preventScroll:true});
    }
  }
}
const rules = () => modal('The fine print, in plain words',list(['Hot water 6–9 am only','No outside food or alcohol','Check in at 1 pm · Check out at 10 am','Government ID needed for every guest','Free cancellation until Wed 18 Nov, 6 pm','No cabs at the lake. Local jeeps are about ₹500 a ride.']));
function promptValue(title,key,value,type='text') {
  modal(title,`<form class="inline-form" id="edit-form" data-key="${key}"><input aria-label="${escape(title)}" type="${type}" ${type==='number'?'min="1000" max="10000000" step="1"':'maxlength="60"'} value="${escape(value)}" required><button class="primary">Apply</button></form>`);
}
function send(message) {
  const q=message.trim();
  if(!q) return;
  if(/^https?:\/\//i.test(q)||/reel/i.test(q)) {
    move(/unknown|unreadable|monsoon|wander\.with\.sid/i.test(q)?'reelError':'reel');
    return;
  }
  const matching=places.findIndex(p=>q.toLowerCase().includes(p.name.toLowerCase()));
  if (matching>=0 && (s.page==='reelError'||asksForPlace(q))) {
    s.place=matching;
    move('place');
    return;
  }
  if(s.booked&&/add|join|change|swap|move/i.test(q)) {
    s.scenario=/date|weekend/.test(q)?'dates':/stay|room/.test(q)?'stay':/stop|activity/.test(q)?'stop':'person';
    move('change');
    return;
  }
  if(/car/i.test(q)&&/cottage/i.test(q)) {
    s.mode='Car';s.room='Cottage';move('over');return;
  }
  if(/\b4\b.*(?:people|friends)|(?:people|friends).*\b4\b/i.test(q)) s.group='3 or more';
  const budget=q.match(/(?:₹|rs\.?\s*)([\d,]+)\s*(k\b)?/i);
  if(budget) {
    const amount=Number(budget[1].replaceAll(',',''))*(budget[2]?1000:1);
    if(amount>0 && amount<=10000000) s.budget=amount;
  }
  s.request=q;
  move('ask');
}
const asksForPlace = message => /explore|show me|take me to/i.test(message);
const handlers = {
  home: ()=>start('home'),
  trips: ()=>s.booked?move('booked'):modal('My Trips','<p>Your demo booking will appear here after confirmation.</p>'),
  homeInfo: b=>modal(b.dataset.value,'<p>Explore weekend trip ideas with Cleartrip Ask AI.</p>'+button('Ask AI','begin','primary')),
  service: b=>{s.request='Help me plan a weekend with '+b.dataset.value.toLowerCase();move('ask');},
  go: b=>move(b.dataset.page),
  begin: ()=>move('ask'),
  start: b=>start(b.dataset.page),
  choose: b=>{
    const {key,value}=b.dataset;
    s[key]=value;
    if(key==='food') s.foodFilter=value==='Both'?'All':value;
    if(key==='room') s.priceDelta=0;
    render();
  },
  city: ()=>promptValue('Departure city','city',s.city),
  budget: ()=>promptValue('Trip budget','budget',s.budget,'number'),
  plan: ()=>move('planning'),
  stop: ()=>goBack(),
  place: b=>{s.place=Number(b.dataset.index);move('place');},
  compare: ()=>{s.comparing=!s.comparing;render();},
  rotate: ()=>{s.crowd=!s.crowd;s.comparing=false;render();},
  why: ()=>modal('Why this place?',`<p>${currentPlace().name} balances travel time and available budget. Estimates, reviews, and conditions in this demo are illustrative.</p>`),
  share: ()=>modal('Share this demo',`<p>Copy the prototype link to reopen Cleartrip Ask AI.</p><input aria-label="Prototype link" value="${escape(location.href)}" readonly onfocus="this.select()">`),
  photo: b=>modal('Stay photo',photo(b.dataset.photo,b.getAttribute('aria-label'))),
  rules,
  property: b=>{s.property=b.dataset.value;s.room=s.property==='Lakeview Camps'?'Lake-view tent':s.property;s.priceDelta=0;move('stay');},
  stayNext: ()=>move('food'),
  meal: ()=>{s.skippedMeal=!s.skippedMeal;render();},
  foodSwap: ()=>{s.foodFilter=s.foodFilter==='Veg'?'Non-veg':'Veg';s.meals=s.foodFilter==='Veg'?2200:2400;render();},
  foodNext: ()=>move(costs().total>limit()?'over':'itinerary'),
  split: ()=>{s.property='Lakeview Camps';s.room='Cottage Friday, tent Saturday';s.priceDelta=0;move(costs().total>limit()?'noBudget':'itinerary');},
  bike: ()=>{s.mode='Bike';move(costs().total>limit()?'noBudget':'itinerary');},
  reelPlan: ()=>{s.activity=s.reelType==='This trek'?'Kalsubai sunrise trek':'Randha Falls viewpoint';move('planning');},
  focus: ()=>document.querySelector('#message').focus(),
  day: ()=>{s.planType='day';s.date='Sunday';s.mode='Car';move('itinerary');},
  tents: ()=>{s.planType='tents';s.mode='Bike';s.room='Lake-view tent';s.priceDelta=0;move('itinerary');},
  confirm: ()=>{s.booked=true;move('booked');},
  changeOption: b=>{s.scenario=b.dataset.value;render();},
  addPerson: ()=>{s.group=people()>=3?'3 or more':'3 people';s.extra+=1200;s.meals+=900;move('booked');},
  changeDates: ()=>{s.date='Next weekend';move('booked');},
  changeStay: ()=>{s.property='Lakeview Camps';s.room='Cottage';s.priceDelta=0;move('booked');},
  changeStop: ()=>{s.activityDay=3;move('itinerary');},
  acceptPrice: ()=>{s.priceDelta=0;move('review');},
  sold: ()=>{s.scenario='sold';render();},
  switchTent: ()=>{s.room='Lake-view tent';s.priceDelta=0;move('review');},
  weatherApply: ()=>{if(s.activity==='Kayaking at Arthur Lake')s.activity='Randha Falls viewpoint';move('itinerary');}
};
document.querySelector('#scenarios').innerHTML=Object.entries(scenarios).map(([page,label])=>button(label,'start','scenario',`data-page="${page}"`)).join('');
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-action]');
  if(!target) return;
  actionSource=target;
  try {handlers[target.dataset.action]?.(target);}
  finally {actionSource=undefined;}
});
const demoMenu=()=>{modal('Try a scenario','');document.querySelector('#scenarios').hidden=false;};
function goBack() {
  if(s.page==='home'){demoMenu();return;}
  clearTimeout(timer);
  const previous=history.pop();
  s=previous?.state??initial();
  render('back',previous?.scrollTop??0);
}
document.querySelector('#back').addEventListener('click',goBack);
document.querySelector('#reset').addEventListener('click',()=>{if(s.page==='home') demoMenu();else if(screenHeaders[s.page]) handlers.share();else start('home');});
document.querySelector('#voice').addEventListener('click',()=>{document.querySelector('#message').focus();});
document.querySelector('#reel').addEventListener('click',()=>modal('Start from a reel',
  '<p>Try the Kalsubai sample or paste a reel link in the chat.</p>'+
  button('Open sample reel','go','primary','data-page="reel"')+' '+button('Try an unreadable reel','go','secondary','data-page="reelError"')));
dialog.addEventListener('click',e=>{if(e.target.closest('[data-action]'))dialog.close();});
document.querySelector('#composer').addEventListener('submit',e=>{
  e.preventDefault();
  const input=document.querySelector('#message');
  const message=input.value;
  input.value='';
  send(message);
});
dialog.addEventListener('submit',e=>{
  if(e.target.id!=='edit-form')return;
  e.preventDefault();
  const value=e.target.querySelector('input').value.trim();
  if(!value)return;
  const key=e.target.dataset.key;
  s[key]=key==='budget'?Number(value):value;
  dialog.close();
  if(key==='budget'&&s.page==='over'&&costs().total<=limit())move('itinerary');
  else if(key==='budget'&&s.page==='noBudget')move('ask');
  else render();
});
render();
