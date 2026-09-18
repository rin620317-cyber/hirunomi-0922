// usage: node extract.js <agent jsonl> <out.json>
const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');
let found=null;
for(const l of lines.reverse()){
  let o; try{o=JSON.parse(l)}catch(e){continue}
  const c=o.message?.content; if(!Array.isArray(c)) continue;
  for(const b of c){ if(b.type==='text'&&b.text.includes('```json')){found=b.text;break} }
  if(found)break;
}
const m=found.match(/```json\s*([\s\S]*?)```/);
const arr=JSON.parse(m[1]);
fs.writeFileSync(process.argv[3],JSON.stringify(arr,null,1));
console.log(arr.length,'shops', arr.filter(s=>s.type==='lunch').length,'lunch');
