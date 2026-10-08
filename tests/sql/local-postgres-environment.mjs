import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync,existsSync,readFileSync,writeFileSync,realpathSync,readdirSync,lstatSync } from 'node:fs'
import { join,resolve,dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const execute=promisify(execFile)
export const localEnvironment=Object.freeze({
 root:'E:/SkyGuideAssets/research/postgres-durable-restore-2026-10-08-6ff3fa7',
 image:'postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826',
 task:'sky-guide-r1-local-6ff3fa7',names:['sg-r1-source-6ff3fa7','sg-r1-restore-6ff3fa7'],
 maxDataBytes:2*1024**3,memory:768*1024**2,nanoCpus:1_000_000_000,
 endpoint:'npipe:////./pipe/dockerDesktopLinuxEngine',
})
export function normalizeLocalMount(value){
 return value.replace(/^\/run\/desktop\/mnt\/host\/e\//i,'E:/').replaceAll('\\','/').replace(/\/$/,'').toLowerCase()
}
export function verifyLocalContainer(actual,name,id){
 assert.ok(localEnvironment.names.includes(name))
 assert.equal(actual.Id,id);assert.equal(actual.Name,`/${name}`)
 assert.equal(actual.Config.Labels['sky-guide.task'],localEnvironment.task)
 assert.equal(actual.Config.Image,localEnvironment.image)
 assert.equal(actual.HostConfig.NetworkMode,'none')
 assert.equal(actual.HostConfig.Memory,localEnvironment.memory)
 assert.equal(actual.HostConfig.MemorySwap,localEnvironment.memory)
 assert.equal(actual.HostConfig.NanoCpus,localEnvironment.nanoCpus)
 assert.equal(Object.keys(actual.HostConfig.PortBindings??{}).length,0)
 assert.equal(actual.HostConfig.LogConfig.Type,'json-file')
 assert.equal(actual.HostConfig.LogConfig.Config['max-size'],'10m')
 assert.equal(actual.HostConfig.LogConfig.Config['max-file'],'1')
 assert.equal(actual.Mounts.length,1)
 const mount=actual.Mounts[0]
 assert.equal(mount.Type,'bind');assert.equal(mount.Destination,'/var/lib/postgresql/data');assert.equal(mount.RW,true)
 assert.equal(normalizeLocalMount(mount.Source),normalizeLocalMount(join(localEnvironment.root,name)))
 assert.ok(!actual.Config.Env.some(v=>/^POSTGRES_PASSWORD=/.test(v)))
 return {id,name,image:localEnvironment.image,network:'none',memory:localEnvironment.memory,cpus:1,data:mount.Source}
}

export async function localDocker(args,{timeout=30000,log}={}){
 assert.equal(process.platform,'win32')
 try{
  const result=await execute('docker',['--host',localEnvironment.endpoint,...args],{windowsHide:true,timeout,maxBuffer:8*1024**2})
  if(log)writeFileSync(join(localEnvironment.root,log),result.stdout+result.stderr)
  return result.stdout
 }catch(error){
  if(log)writeFileSync(join(localEnvironment.root,log),`${error.stdout??''}${error.stderr??''}`)
  throw new Error(`Docker operation failed: ${args[0]}${log?`; inspect ${log}`:''}`,{cause:error})
 }
}
export function readLocalManifest(){return JSON.parse(readFileSync(join(localEnvironment.root,'environment.json'),'utf8'))}
export function assertLocalDataBudget(){
 let bytes=0
 const visit=directory=>{
  const actual=normalizeLocalMount(realpathSync(directory)),base=normalizeLocalMount(localEnvironment.root)
  assert.ok(actual===base||actual.startsWith(base+'/'),'Task path escaped approved root')
  for(const name of readdirSync(directory)){
   const path=join(directory,name),stat=lstatSync(path)
   assert.ok(!stat.isSymbolicLink(),'Unexpected task data link: STOP')
   if(stat.isDirectory())visit(path);else bytes+=stat.size
   assert.ok(bytes<=localEnvironment.maxDataBytes,'Task data exceeds approved2 GiB: STOP')
  }
 }
 visit(localEnvironment.root)
 return bytes
}
export async function assertLocalTarget(name){
 const manifest=readLocalManifest()
 const recorded=manifest.containers.find(c=>c.name===name)
 assert.ok(recorded,'Container not recorded by approved setup')
 const [actual]=JSON.parse(await localDocker(['inspect',recorded.id]))
 verifyLocalContainer(actual,name,recorded.id)
 return actual
}
export async function localSql(name,sql,{user='postgres',log='sql-result.log'}={}){
 assert.ok(['postgres','supabase_admin'].includes(user))
 await assertLocalTarget(name)
 assertLocalDataBudget()
 // No shell interpolation or SQL/credential arguments: send SQL on stdin.
 const { spawn }=await import('node:child_process')
 const child=spawn('docker',['--host',localEnvironment.endpoint,'exec','-i',name,'psql','-X','-U',user,'-d','postgres','-v','ON_ERROR_STOP=1','-A','-t'],{windowsHide:true,stdio:['pipe','pipe','pipe']})
 let stdout='',stderr=''
 child.stdout.on('data',b=>{stdout+=b});child.stderr.on('data',b=>{stderr+=b})
 const done=new Promise((resolve,reject)=>{child.once('error',()=>reject(new Error('Local psql launch failed')));child.once('close',code=>{writeFileSync(join(localEnvironment.root,log),stdout+stderr);if(code!==0)reject(new Error(`Local SQL failed; inspect ${log}`));else resolve(stdout)})})
 child.stdin.on('error',()=>{});child.stdin.end(sql)
 const result=await done
 assertLocalDataBudget()
 return result
}
export async function setupLocalEnvironment(){
 assert.equal(process.platform,'win32')
 assert.ok(normalizeLocalMount(resolve(localEnvironment.root)).startsWith('e:/skyguideassets/research/postgres-durable-restore-'))
 assert.ok(!existsSync(localEnvironment.root),'Fresh setup only; inspect existing manifest instead of recreating')
 assert.equal(normalizeLocalMount(realpathSync(dirname(localEnvironment.root))),normalizeLocalMount(dirname(localEnvironment.root)),'Parent is not the approved E directory')
 mkdirSync(localEnvironment.root)
 assert.equal(normalizeLocalMount(realpathSync(localEnvironment.root)),normalizeLocalMount(localEnvironment.root))
 const server=JSON.parse(await localDocker(['info','--format','{{json .}}'],{log:'docker-info.json'}))
 assert.equal(server.OSType,'linux')
 const inventory=await localDocker(['ps','-a','--format','{{.Names}}'],{log:'existing-container-names.txt'})
 for(const name of localEnvironment.names)assert.ok(!inventory.split(/\r?\n/).includes(name),'Name already belongs to a container')
 await localDocker(['pull',localEnvironment.image],{timeout:300000,log:'image-pull.log'})
 const manifest={authority:'Direct user approval of local proposal at6ff3fa7',...localEnvironment,containers:[],state:'SETTING UP'}
 writeFileSync(join(localEnvironment.root,'environment.json'),JSON.stringify(manifest,null,2)+'\n')
 for(const name of localEnvironment.names){
  const data=join(localEnvironment.root,name);mkdirSync(data)
  const id=(await localDocker(['create','--name',name,'--label',`sky-guide.task=${localEnvironment.task}`,
   '--cpus','1','--memory','768m','--memory-swap','768m','--network','none',
   '--log-driver','json-file','--log-opt','max-size=10m','--log-opt','max-file=1',
   '--mount',`type=bind,source=${data},target=/var/lib/postgresql/data`,
   '-e','POSTGRES_USER=supabase_admin','-e','POSTGRES_DB=postgres',
   '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_INITDB_ARGS=--auth-local=trust',localEnvironment.image],{log:`${name}-create.log`})).trim()
  assert.match(id,/^[a-f0-9]{64}$/)
  manifest.containers.push({id,name});writeFileSync(join(localEnvironment.root,'environment.json'),JSON.stringify(manifest,null,2)+'\n')
  await assertLocalTarget(name)
  await localDocker(['start',id],{log:`${name}-start.log`})
 }
 manifest.state='CREATED / VERSION AND MOUNT PREFLIGHT REQUIRED'
 writeFileSync(join(localEnvironment.root,'environment.json'),JSON.stringify(manifest,null,2)+'\n')
 process.stdout.write('Created exactly two approved isolated containers; DB/schema preflight pending\n')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv[2]!=='setup')throw new Error('Use setup; no unguarded delete/recreation operation')
 await setupLocalEnvironment()
}
