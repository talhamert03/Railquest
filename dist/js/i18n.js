/** Language: Turkish on Turkish devices, English everywhere else. Chosen once, from the system locale. */
function detect(){
 try{return /^tr\b/i.test(navigator.languages?.[0]||navigator.language||'')?'tr':'en';}catch{return 'en';}
}
export const LANG=typeof navigator==='undefined'?'tr':detect();
/** Picks the Turkish or English variant of a text. */
export const L=(tr,en)=>LANG==='tr'?tr:en;
if(typeof document!=='undefined')document.documentElement.lang=LANG;

const LEVEL_NAMES_EN={
 1:'First Link',2:'Little Bend',3:'Around the Flowers',4:'Two Pretty Paths',5:'You First',6:'Take the Long Way',7:'Right on Time',8:'Meadow Meetup',
 9:'The Far Side of the Hill',10:'The Turning Pass',11:'Tunnel Queue',12:'A or B?',13:'Over the Creek',14:'Two Bridges',15:'Shore to Summit',16:'Rhythm of the Passes',
 17:'Three Travel Buddies',18:'High Road, Low Road',19:'Bottleneck',20:'Mountain Express',21:'Secret of the Three Bridges',22:'Twin Peaks',23:'The Last Switch',24:'The Grand Meetup',
 25:'One Minute Apart',26:'The Fourth Passenger',27:'Clockwork Crossing',28:'Four Shores',29:'One Track, Two Breaths',30:'The Three-Letter Secret',31:'Shortcut Trap',32:'Wrong Side',
 33:'Room for One Beat',34:'Nested Passes',35:'Perfect Four',36:'Masters’ Meetup',37:'Canyon Switch',38:'Oasis Hours',39:'Narrow Caravan',40:'Labyrinth of Sand',
 41:'Beyond the Snow',42:'Polar Knot',43:'Three Ice Gates',44:'Last Snow Express',45:'Catch the Green',46:'Copper Rendezvous',47:'Caravan Signals',48:'Pulse of the Canyon',
 49:'The Sixth Passenger',50:'Snow Watch',51:'Ice Clocks',52:'Six Paths, One Moment',53:'Key First',54:'The Caravan’s Three Keys',55:'One Bridge, One Wagon',56:'Lock of the Oasis',
 57:'The Clockmaker’s Locks',58:'The Last Key'
};
const WORLDS_EN=[
 ['Meadow Lines','First meetups on green islands.'],
 ['Sand Sea','Cacti, cool oases and gently drifting sand.'],
 ['Snow Stations','Snowy pines, warm cabins and a sixth passenger.'],
 ['Time Gardens','Copper clocks, purple gardens and wagons that catch the green.'],
 ['Red Canyon','Find the caravan’s rhythm among red cliffs.'],
 ['Glacier Passes','Blue crystals, ice arches and the final six-wagon meetup.']
];
/** Display names only; ids, rules and saves never depend on them. */
export function localizeContent(levels,worlds){
 if(LANG==='tr')return;
 for(const l of levels)if(LEVEL_NAMES_EN[l.id])l.name=LEVEL_NAMES_EN[l.id];
 worlds.forEach((w,i)=>{if(WORLDS_EN[i])[w.name,w.subtitle]=WORLDS_EN[i];});
}
