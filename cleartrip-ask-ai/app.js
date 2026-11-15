const screen = document.querySelector('#screen');
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
const rupees = n => '₹' + new Intl.NumberFormat('en-IN').format(n);
const escape = str => String(str).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const photo = (name, alt, cls='hero') => `<img class="${cls}" src="assets/imgPhoto${name}.jpg" alt="${escape(alt)}">`;
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
const choose = (key,value,label=value) => button(label,'choose','pill',`data-key="${key}" data-value="${escape(value)}" aria-pressed="${s[key]===value}"`);
const group = (title,key,options) => `<fieldset class="group"><legend>${escape(title)}</legend><div class="chips">${options.map(x=>choose(key,x)).join('')}</div></fieldset>`;
const reply = message => `<div class="reply"><span aria-hidden="true">✧</span><p>${escape(message)}</p></div>`;
const bubble = message => `<p class="bubble">${escape(message)}</p>`;
const card = html => `<section class="card">${html}</section>`;
const tag = value => `<span class="tag">${escape(value)}</span>`;
const list = items => `<ul class="list">${items.map(x=>`<li>${escape(x)}</li>`).join('')}</ul>`;
const row = (title, detail, price='', image='') => `<div class="rowcard"><div><strong>${escape(title)}</strong><p class="muted">${escape(detail)}</p></div>${price?`<div class="price">${escape(price)}</div>`:''}${image?photo(image,title,''):''}</div>`;
const primary = (label,action) => button(label,action,'primary wide');
const balance = total => total <= limit() ? `${rupees(limit()-total)} under budget` : `${rupees(total-limit())} over budget`;
const context = () => `<div class="chips">${[`From ${s.city}`,s.date,`${people()} people`,rupees(limit()),s.mode].map(tag).join('')}</div>`;
const destination = index => button('Explore '+places[index].name,'place','primary wide',`data-index="${index}"`);
const scenarios = {'home':'Cleartrip home','ask':'₹15K weekend','reel':'Start from a reel','reelError':'Reel can’t be read','noBudget':'Nothing fits the budget','over':'Car + cottage trade-off','price':'Price changed or sold out','change':'Change after booking','weather':'Disruption during the trip'};
function move(page) {
  clearTimeout(timer);
  history.push({...s});
  s.page = page;
  render(true);
  if (page === 'planning') timer = setTimeout(() => move(people() >= 4 && limit()<18000 && !s.planType ? 'noBudget' : 'pick'),2200);
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
  render(true);
}
function modal(title, content) {
  document.querySelector('#dialog-body').innerHTML = `<h2 id="dialog-title">${escape(title)}</h2>${content}`;
  dialog.showModal();
}
const pageViews = {
  home: () => `<h1>Where to next?</h1>${button('✧  Explore your next adventure with AI','begin','home-search')}<div class="grid">${['Hotels','Flights','Trains','Buses','Activities'].map(x=>`<div class="card home-tile"><strong>${x}</strong><small>Explore Cleartrip</small></div>`).join('')}</div>${photo('BhandardaraHero','Weekend getaway by the lake')}${primary('✧  Ask AI','begin')}`,
  ask: () => bubble(s.request)+reply(`${rupees(s.budget)} this weekend. A few quick choices so I can plan it right.`)+card(
    group(`${rupees(s.budget)} is for`,'scope',['Whole trip','Per person'])+
    group('Who’s going?','group',['Just me','2 of us','3 or more'])+
    `<fieldset class="group"><legend>Leaving from</legend><div class="chips">${choose('city',s.city)}${button('Change','city')}</div></fieldset>`+
    group('Food','food',['Veg','Non-veg','Both'])+group('Getting there','mode',['Bike','Car','Train','Bus'])+primary('✧  Plan my weekend','plan')),
  planning: () => bubble(s.request)+reply('On it. I’m checking what fits.')+card(`<h2>Planning your weekend</h2><progress aria-label="Planning progress" value="3" max="5"></progress>`+list(['Found places within 4 hours','Filtered for your dates and budget','Checked the weather','Comparing stays and guest reviews','Pricing transport, food and activities'])+button('Stop','stop')),
  pick: () => {
    const p=places[s.crowd?1:0];const index=places.indexOf(p);
    return context()+reply(s.comparing?'Here’s how all three compare.':'3 places fit your preferences. My pick first.')+
      (s.comparing?card(places.map((x,i)=>row(x.name,`${x.time} · ${x.crowd}`,rupees(x.estimate))+destination(i)).join('')):
      card(`<div class="hero-wrap">${photo(p.photo,p.name)}<div class="hero-caption"><h2>${p.name}</h2><p>${p.desc}</p></div></div><div class="stats"><div><strong>${rupees(p.estimate)}</strong><small>${balance(p.estimate)}</small></div><div><strong>${p.time}</strong><small>From ${escape(s.city)}</small></div><div><strong>16–27°</strong><small>Clear skies</small></div></div>${tag('Best for you')}${tag(p.crowd)}<p>${p.name==='Bhandardara'?'Quiet lakes, an easy ride, and room in your budget for kayaking.':'Shorter travel leaves more time at the destination.'}</p>${destination(index)}`)+
      `<h3>Also fits</h3><div class="grid">${places.map((x,i)=>i===index?'':card(photo(x.photo,x.name)+`<strong>${x.name}</strong><p>${rupees(x.estimate)} · ${x.time}</p>${destination(i)}`)).join('')}</div>`)+
      `<div class="chips">${button(s.comparing?'Show my pick':'Compare all 3','compare')}${button('Somewhere new','rotate')}${go('Cheaper options','noBudget')}</div>`;
  },
  place: () => {
    const p=currentPlace();
    return photo(s.place===0?'BhandardaraHero':p.photo,p.name)+`<h1>${p.name}</h1><p>${p.desc} · ${p.time} from ${escape(s.city)}</p>`+
      ['Lake','Waterfalls','Camping','Stargazing'].map(tag).join('')+
      card('<h2>When to go</h2><p>Friday is quieter. Saturday has higher demand for lake-view stays.</p>'+group('Travel dates','date',['Fri 20–Sun 22 Nov','Sat 21–Mon 23 Nov','Next weekend']))+
      card('<h2>What to do</h2>'+group('Activity','activity',['Kayaking at Arthur Lake','Randha Falls viewpoint','Stargazing at camp'])+button('Why this place?','why')+ ' '+button('Share trip','share'))+go('Check stays','stay','primary wide');
  },
  stay: () => card(`${tag('Book on Cleartrip')}<h1>${escape(s.property)}</h1><p>4.3 ★ · 212 reviews · Breakfast and dinner included</p>${group('Photos','gallery',['Guest photos (48)','Hotel photos (12)'])}
     ${photo(s.gallery.startsWith('Guest')?'GuestTentByTheLake':'GuestLakeAtSunrise',s.gallery)}<div class="grid">${['GuestTentInside','GuestWashroom','GuestLakeAtSunrise'].map((x,i)=>`<button class="secondary" data-action="photo" data-photo="${x}" aria-label="Open stay photo ${i+1}">${photo(x,['Inside the tent','Washroom','Lake sunrise'][i])}</button>`).join('')}</div>`)+
    `<div class="notice"><strong>Photos vs reality</strong><p>Guests say some tents are smaller than the property’s photos. Ask for tents 1 to 6 for a lake view.</p></div><div class="grid">${card('<h3>Loved</h3>'+list(['Clean washrooms · 58','Bonfire and food · 41','Friendly staff · 37']))}${card('<h3>Complaints</h3>'+list(['Hot water only mornings · 22','Weak phone signal · 18','Rough last 2 km · 15']))}</div>`+
    card(group('Pick a room','room',s.property==='Lakeview Camps'?['Lake-view tent','Cottage']:['Budget homestay','Lakeside cottage'])+`<p class="price">${rupees(roomCost())} · 2 nights</p>`+button('Read the house rules','rules')+' '+go('2 other stays','stays'))+primary(`Choose stay · ${rupees(roomCost())}`,'stayNext'),
  stays: () => '<h1>Other stays</h1>'+[['Budget homestay','Simpler rooms, no included meals',3200],['Lakeside cottage','More space, quieter location',6800],['Lakeview Camps','Guest photos and two included meals per day',4000]].map(([name,detail,price])=>card(row(name,detail,rupees(price))+button('Inspect '+name,'property','primary',`data-value="${name}"`))).join(''),
  food: () => reply('Here are the meals already included and a few stops you can swap.')+
    card(group('Food preference','foodFilter',['Non-veg','Veg','All'])+'<h3>4 meals are already in your stay</h3><p>Friday and Saturday dinner. Saturday and Sunday breakfast.</p>')+
    card(row('Highway Misal House','Fri · 8:30 am · Veg · 65 km from Pune','₹250','HighwayMisalHouse')+
    (s.foodFilter==='Veg'?row('Camp Kitchen','Sat · Lunch · Veg thali','₹450','CampKitchen'):row('Lakeside Dhaba','Sat · Lunch · '+(s.foodFilter==='All'?'Veg and non-veg':'Non-veg options'),'₹650','LakesideDhaba'))+
    button(s.skippedMeal?'Restore lunch stop':'Skip lunch stop','meal')+' '+button('Swap food stop','foodSwap'))+
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
    const c=costs();
    return `<h1>Review your trip</h1><p>Check each item before you approve.</p>`+photo(currentPlace().photo,currentPlace().name)+`<h2>${currentPlace().name}</h2>`+context()+
      card(`<h3>Whole trip</h3><p class="total">${rupees(c.total)}</p>${tag(balance(c.total))}<p>Pay now on Cleartrip <strong>${rupees(c.stay)}</strong></p><p>On the trip <strong>${rupees(c.total-c.stay)}</strong></p>`)+
      (c.stay?card('<h2>Book on Cleartrip</h2>'+row(s.property,s.room+' · '+people()+' guests',rupees(c.stay))+button('Read house rules','rules')+' '+go('Edit stay','stay')):'')+
      card('<h2>Arrange yourself</h2>'+row(s.mode,'Transport from '+s.city,rupees(c.travel))+row(s.activity,'Pay on the trip',rupees(c.fun))+row('Food','Estimate',rupees(c.food))+row('Buffer','Yours if unused',rupees(c.buffer))+go('Edit itinerary','itinerary'))+
      (c.total>limit()?go('Review budget trade-offs','over','primary wide'):
        primary(c.stay?`Confirm demo payment · ${rupees(c.stay)}`:'Confirm day-trip plan','confirm'))+
      '<p class="muted">This is a simulated booking. No money is collected.</p>';
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
function render(navigate=false) {
  const home=s.page==='home';
  document.querySelector('#brand').textContent=home?'cleartrip':'Cleartrip AI';
  document.querySelector('#subtitle').textContent=home?'':'Suggests a plan. You decide.';
  document.querySelector('#back').disabled=!history.length&&home;
  document.querySelector('#footer').hidden=home;
  document.querySelector('#summary').innerHTML=context()+(s.booked?tag('Trip confirmed'):tag(balance(costs().total)));
  screen.innerHTML=pageViews[s.page]();
  if(navigate) {
    document.querySelector('aside details').open=false;
    screen.focus({preventScroll:true});
    window.scrollTo(0,0);
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
  go: b=>move(b.dataset.page),
  begin: ()=>move('ask'),
  start: b=>start(b.dataset.page),
  choose: b=>{
    const {key,value}=b.dataset;
    s[key]=value;
    if(key==='food') s.foodFilter=value==='Both'?'All':value;
    if(key==='room') s.priceDelta=0;
    render();
    [...screen.querySelectorAll('[data-key]')].find(x=>x.dataset.key===key&&x.dataset.value===value)?.focus();
  },
  city: ()=>promptValue('Departure city','city',s.city),
  budget: ()=>promptValue('Trip budget','budget',s.budget,'number'),
  plan: ()=>move('planning'),
  stop: ()=>{clearTimeout(timer);move('ask');},
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
  if(target) handlers[target.dataset.action]?.(target);
});
document.querySelector('#back').addEventListener('click',()=>{
  clearTimeout(timer);
  s=history.pop()??initial();
  if(s.page==='planning') s=history.pop()??{...s,page:'ask'};
  render(true);
});
document.querySelector('#reset').addEventListener('click',()=>start('home'));
document.querySelector('#reel').addEventListener('click',()=>modal('Start from a reel',
  '<p>Try the Kalsubai sample or paste a reel link in the chat.</p>'+
  button('Open sample reel','go','primary','data-page="reel"')+' '+button('Try an unreadable reel','go','secondary','data-page="reelError"')));
dialog.addEventListener('click',e=>{if(e.target.closest('[data-action]'))dialog.close();});
document.querySelector('#composer').addEventListener('submit',e=>{
  e.preventDefault();
  const input=document.querySelector('#message');
  send(input.value);
  input.value='';
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
