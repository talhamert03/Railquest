import {createServer} from 'node:http';
import {createSign} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {verifyPurchase} from './verification.mjs';

// Credentials are runtime secrets on this server; never package them with Android or dist.
const credentials=JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON||await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
const packageName=process.env.PLAY_PACKAGE_NAME;
if(!/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(packageName||'')||!credentials.client_email||!credentials.private_key)throw new Error('Configure Play service account and package name');
const allowTest=process.env.PLAY_ALLOW_TEST_PURCHASES==='true';
let accessToken='',expires=0,tokenRequest;
const b64=value=>Buffer.from(value).toString('base64url');
async function authenticate(){
 if(Date.now()<expires)return accessToken;
 if(tokenRequest)return tokenRequest;
 tokenRequest=(async()=>{
  const now=Math.floor(Date.now()/1000),header=b64(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claim=b64(JSON.stringify({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const payload=`${header}.${claim}`,signature=createSign('RSA-SHA256').update(payload).sign(credentials.private_key,'base64url');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${payload}.${signature}`}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Service authentication unavailable');
  const data=await response.json();if(!data.access_token)throw new Error('Missing service token');
  accessToken=data.access_token;expires=Date.now()+Math.max(0,Number(data.expires_in||3600)-120)*1000;return accessToken;
 })().finally(()=>{tokenRequest=null;});return tokenRequest;
}
async function google(url,options={}){
 return fetch(url,{...options,headers:{Authorization:`Bearer ${await authenticate()}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000)});
}
const buckets=new Map();let inFlight=0;
const reply=(response,code,body)=>{response.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(body));};
const server=createServer(async(request,response)=>{
 if(request.url==='/health'&&request.method==='GET'){reply(response,200,{ok:true});return;}
 if(request.url!=='/verify'||request.method!=='POST'){reply(response,404,{error:'not_found'});return;}
 if(!request.headers['content-type']?.startsWith('application/json')){reply(response,415,{error:'json_required'});return;}
 // Also apply per-client rate limiting at the HTTPS ingress (proxy IPs are deliberately not trusted here).
 const ip=request.socket.remoteAddress,now=Date.now();
 if(buckets.size>10000)for(const [key,b] of buckets)if(now-b.start>60000)buckets.delete(key);
 const bucket=buckets.get(ip);const current=bucket&&now-bucket.start<60000?bucket:{start:now,count:0};buckets.set(ip,current);
 if(++current.count>60||inFlight>=20){reply(response,429,{error:'try_later'});return;}
 inFlight++;
 try{
  let size=0;const chunks=[];
  for await(const chunk of request){size+=chunk.length;if(size>8192){reply(response,413,{error:'request_too_large'});return;}chunks.push(chunk);}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{reply(response,400,{error:'invalid_json'});return;}
  if(!data||Array.isArray(data)||Object.keys(data).some(k=>k!=='purchaseToken')){reply(response,400,{error:'invalid_request'});return;}
  const result=await verifyPurchase({token:data.purchaseToken,packageName,allowTest,google});reply(response,result.code,result.body);
 }catch{reply(response,503,{error:'verification_temporarily_unavailable'});}finally{inFlight--;}
});
server.requestTimeout=20000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>process.stdout.write('Rota purchase verifier ready\n'));
