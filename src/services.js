import {BrowserProvider, Contract, getAddress, isAddress, parseEther, formatEther} from 'ethers';
import abi from './abi.json';
export const ACCOUNTS = {
  employer:{address:'0x1111111111111111111111111111111111111111', name:'ณิชา', role:'ผู้ว่าจ้าง', initials:'ณช'},
  freelancer:{address:'0x2222222222222222222222222222222222222222', name:'กานต์', role:'ฟรีแลนซ์', initials:'กน'},
  admin:{address:'0x3333333333333333333333333333333333333333', name:'ผู้ดูแลระบบ', role:'ผู้ดูแล', initials:'AD'}
};
export const STATUS = ['รอฝากเงิน','กำลังดำเนินงาน','รอตรวจรับ','มีข้อพิพาท','จ่ายเงินแล้ว','คืนเงินแล้ว','ยกเลิกแล้ว'];
export const ACTIONS = {CREATE:'สร้างข้อตกลง', DEPOSIT:'ฝากเงินเข้า Escrow',SUBMIT:'ส่งมอบงาน',RELEASE:'อนุมัติและจ่ายเงิน',DISPUTE:'เปิดข้อพิพาท',RESOLVE_PAY:'ผู้ดูแลอนุมัติจ่ายเงิน',RESOLVE_REFUND:'ผู้ดูแลคืนเงิน',CANCEL:'ยกเลิกข้อตกลง'};
const STORE='worksure.demo.v1';
const now=()=>Math.floor(Date.now()/1000);
function seed(){
 const base={employer:ACCOUNTS.employer.address,freelancer:ACCOUNTS.freelancer.address,deadline:now()+86400*14,evidence:'',disputeReason:''};
 const jobs=[
 {...base,id:1,title:'ออกแบบเว็บไซต์แบรนด์กาแฟ',description:'ออกแบบหน้าแรก หน้าสินค้า และหน้าติดต่อ พร้อม responsive สำหรับมือถือ ส่งมอบไฟล์ต้นฉบับและ prototype',amount:'0.08',status:0},
 {...base,id:2,title:'พัฒนา Dashboard วิเคราะห์ยอดขาย',description:'พัฒนา dashboard สรุปยอดขายรายเดือน พร้อมตัวกรองและกราฟสำหรับทีมธุรกิจ',amount:'0.15',status:1},
 {...base,id:3,title:'ออกแบบอัตลักษณ์แบรนด์ Bloom',description:'ออกแบบโลโก้ สี ฟอนต์ และ brand guideline สำหรับธุรกิจดอกไม้',amount:'0.12',status:2,evidence:'https://example.com/delivery/bloom-brand'},
 {...base,id:4,title:'พัฒนา Landing Page เปิดตัวสินค้า',description:'พัฒนาหน้าเปิดตัวสินค้าให้ตรงตามแบบและรองรับมือถือ',amount:'0.06',status:3,disputeReason:'ส่วนแสดงสินค้ายังไม่ตรงตามขอบเขตงานที่ตกลง'}];
 const activity=jobs.flatMap(j=>[{jobId:j.id,actor:j.employer,action:'CREATE',details:j.title,amount:j.amount,time:now()-86400*2},...(j.status>0?[{jobId:j.id,actor:j.employer,action:'DEPOSIT',details:'ฝากเงินครบจำนวน',amount:j.amount,time:now()-86400}]:[]),...(j.status===2?[{jobId:j.id,actor:j.freelancer,action:'SUBMIT',details:j.evidence,amount:'0',time:now()-7200}]:[]),...(j.status===3?[{jobId:j.id,actor:j.employer,action:'DISPUTE',details:j.disputeReason,amount:'0',time:now()-3600}]:[])]).map((a,i)=>({...a,hash:`DEMO-SEED-${i+1}`}));
 return {jobs,activity,balances:{[ACCOUNTS.employer.address]:parseEther('4.67').toString(),[ACCOUNTS.freelancer.address]:parseEther('1').toString(),[ACCOUNTS.admin.address]:'0'}};
}
export function demoRead(){try{const s=JSON.parse(localStorage.getItem(STORE));if(s?.jobs&&s?.balances)return s;}catch{}const s=seed();localStorage.setItem(STORE,JSON.stringify(s));return s;}
export function demoReset(){localStorage.setItem(STORE,JSON.stringify(seed()));}
const equal=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
export {equal,isAddress,parseEther,formatEther};
export async function demoAction(actor,action,id,data={}){
 const s=demoRead();let j=s.jobs.find(x=>x.id===id);let amount='0';let details='';
 const need=(ok,message)=>{if(!ok)throw Error(message);};
 const employer=()=>need(equal(actor,j?.employer),'เฉพาะผู้ว่าจ้างของงานนี้');
 if(action==='CREATE'){
  need(isAddress(data.freelancer)&&!equal(actor,data.freelancer),'Wallet ฟรีแลนซ์ไม่ถูกต้อง หรือเป็นบัญชีเดียวกับผู้ว่าจ้าง');
  need(data.title.trim()&&new TextEncoder().encode(data.title.trim()).length<=240,'ชื่อโครงการต้องมี 1–240 bytes');
  need(data.description.trim()&&new TextEncoder().encode(data.description.trim()).length<=6000,'รายละเอียดต้องมี 1–6000 bytes');
  need(parseEther(data.amount)>0n,'ค่าจ้างต้องมากกว่า 0');need(data.deadline>now(),'กำหนดส่งต้องอยู่ในอนาคต');
  j={id:s.jobs.length+1,employer:actor,freelancer:getAddress(data.freelancer),title:data.title.trim(),description:data.description.trim(),amount:formatEther(parseEther(data.amount)),deadline:data.deadline,status:0,evidence:'',disputeReason:''};s.jobs.push(j);amount=j.amount;details=j.title;
 }else{
  need(j,'ไม่พบงาน');
  if(action==='DEPOSIT'){employer();need(j.status===0,'สถานะไม่อนุญาตให้ฝากเงิน');const wei=parseEther(j.amount);need(BigInt(s.balances[actor]||0)>=wei,'ยอดเงินสาธิตไม่พอ');s.balances[actor]=(BigInt(s.balances[actor])-wei).toString();j.status=1;amount=j.amount;details='ฝากเงินครบจำนวน';}
  if(action==='SUBMIT'){need(equal(actor,j.freelancer),'เฉพาะฟรีแลนซ์ของงานนี้');need([1,2].includes(j.status),'สถานะไม่อนุญาตให้ส่งงาน');need(data.text?.trim()&&new TextEncoder().encode(data.text.trim()).length<=2000,'หลักฐานต้องมี 1–2000 bytes');j.evidence=data.text.trim();j.status=2;details=j.evidence;}
  if(action==='DISPUTE'){need(equal(actor,j.employer)||equal(actor,j.freelancer),'เฉพาะคู่สัญญา');need([1,2].includes(j.status),'สถานะไม่อนุญาตให้เปิดข้อพิพาท');need(data.text?.trim()&&new TextEncoder().encode(data.text.trim()).length<=2000,'เหตุผลต้องมี 1–2000 bytes');j.status=3;j.disputeReason=data.text.trim();details=j.disputeReason;}
  if(['RELEASE','RESOLVE_PAY','RESOLVE_REFUND'].includes(action)){
   if(action==='RELEASE'){employer();need(j.status===2,'ต้องส่งมอบงานก่อน และห้ามจ่ายซ้ำ');details='ตรวจรับงานเรียบร้อย';}
   else{need(equal(actor,ACCOUNTS.admin.address),'เฉพาะผู้ดูแลระบบ');need(j.status===3,'ต้องเป็นงานที่มีข้อพิพาท');need(data.text?.trim()&&new TextEncoder().encode(data.text.trim()).length<=2000,'กรุณาระบุคำตัดสิน 1–2000 bytes');details=data.text.trim();}
   const refund=action==='RESOLVE_REFUND';const to=(refund?j.employer:j.freelancer).toLowerCase();s.balances[to]=(BigInt(s.balances[to]||0)+parseEther(j.amount)).toString();j.status=refund?5:4;amount=j.amount;
  }
  if(action==='CANCEL'){employer();need(j.status===0,'ยกเลิกได้เฉพาะก่อนฝากเงิน');j.status=6;details='ยกเลิกก่อนฝากเงิน';}
 }
 s.activity.push({jobId:j.id,actor,action,details,amount,time:now(),hash:`DEMO-${crypto.randomUUID()}`});
 localStorage.setItem(STORE,JSON.stringify(s));return j.id;
}
export function configRead(){try{return {...{chainId:11155111,address:'',deploymentBlock:0},...JSON.parse(localStorage.getItem('worksure.chain')||'{}')};}catch{return {chainId:11155111,address:'',deploymentBlock:0};}}
export function configSave(config){localStorage.setItem('worksure.chain',JSON.stringify(config));}
export async function walletConnect(){
 if(!window.ethereum)throw Error('ไม่พบกระเป๋า Ethereum กรุณาติดตั้ง MetaMask หรือกระเป๋าที่รองรับ');
 const provider=new BrowserProvider(window.ethereum);await provider.send('eth_requestAccounts',[]);const signer=await provider.getSigner();return {provider,signer,address:await signer.getAddress()};
}
async function checkedContract(config,session){
 const network=await session.provider.getNetwork();
 if(Number(network.chainId)!==Number(config.chainId))throw Error(`กรุณาเปลี่ยนเครือข่ายในกระเป๋าเป็น Chain ID ${config.chainId}`);
 if(!isAddress(config.address))throw Error('กรุณาตั้งค่า Contract Address จาก Remix IDE ก่อน');
 const code=await session.provider.getCode(config.address);if(code==='0x')throw Error('ไม่พบ Smart Contract ที่ address นี้');
 return new Contract(config.address,abi,session.signer);
}
export async function walletRead(config,session){
 const contract=await checkedContract(config,session);const count=Number(await contract.jobCount());const jobs=[];
 for(let i=1;i<=count;i++){
  const j=await contract.getJob(i);jobs.push({id:Number(j.id),employer:j.employer,freelancer:j.freelancer,title:j.title,description:j.description,amount:formatEther(j.amount),deadline:Number(j.deadline),status:Number(j.status),evidence:j.evidence,disputeReason:j.disputeReason});
 }
 const last=await session.provider.getBlockNumber();const activity=[];
 for(let from=Number(config.deploymentBlock)||0;from<=last;from+=2000){
  const logs=await contract.queryFilter(contract.filters.Activity(),from,Math.min(from+1999,last));
  for(const log of logs){const b=await log.getBlock();activity.push({jobId:Number(log.args.jobId),actor:log.args.actor,action:log.args.action,details:log.args.details,amount:formatEther(log.args.amount),time:b.timestamp,hash:log.transactionHash,blockNumber:log.blockNumber});}
 }
 return {jobs,activity,admin:await contract.administrator(),balance:formatEther(await session.provider.getBalance(session.address))};
}
export async function walletAction(config,session,action,id,data,onPending){
 const contract=await checkedContract(config,session);let tx;
 if(action==='CREATE')tx=await contract.createJob(data.title.trim(),data.description.trim(),data.freelancer,parseEther(data.amount),data.deadline);
 if(action==='DEPOSIT'){const j=await contract.getJob(id);tx=await contract.deposit(id,{value:j.amount});}
 if(action==='SUBMIT')tx=await contract.submitWork(id,data.text.trim());
 if(action==='DISPUTE')tx=await contract.openDispute(id,data.text.trim());
 if(action==='RELEASE')tx=await contract.approve(id);
 if(action==='RESOLVE_PAY'||action==='RESOLVE_REFUND')tx=await contract.resolveDispute(id,action==='RESOLVE_PAY',data.text.trim());
 if(action==='CANCEL')tx=await contract.cancelJob(id);
 onPending(tx.hash);const receipt=await tx.wait();if(receipt.status!==1)throw Error('ธุรกรรมไม่สำเร็จ');return receipt;
}
export function friendlyError(e){if(e.code===4001||e.code==='ACTION_REJECTED')return 'คุณยกเลิกคำขอในกระเป๋าแล้ว';return e.reason||e.shortMessage||e.message||'เกิดข้อผิดพลาด กรุณาลองใหม่';}
export function explorerUrl(chainId,hash){const root=Number(chainId)===11155111?'https://sepolia.etherscan.io':Number(chainId)===1?'https://etherscan.io':null;return root?`${root}/tx/${hash}`:null;}
