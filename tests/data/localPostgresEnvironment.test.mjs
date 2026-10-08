import test from 'node:test'
import assert from 'node:assert/strict'
import { localEnvironment,verifyLocalContainer } from '../sql/local-postgres-environment.mjs'

test('local container guard rejects unrelated IDs, external network/ports, resources and mounts',()=>{
 const name=localEnvironment.names[0],id='a'.repeat(64)
 const container={Id:id,Name:`/${name}`,Config:{Image:localEnvironment.image,Labels:{'sky-guide.task':localEnvironment.task},Env:['POSTGRES_HOST_AUTH_METHOD=trust']},HostConfig:{NetworkMode:'none',Memory:localEnvironment.memory,MemorySwap:localEnvironment.memory,NanoCpus:localEnvironment.nanoCpus,PortBindings:{},LogConfig:{Type:'json-file',Config:{'max-size':'10m','max-file':'1'}}},Mounts:[{Type:'bind',Destination:'/var/lib/postgresql/data',RW:true,Source:`/run/desktop/mnt/host/e/SkyGuideAssets/research/postgres-durable-restore-2026-10-08-6ff3fa7/${name}`}]}
 assert.equal(verifyLocalContainer(container,name,id).network,'none')
 for(const mutate of [c=>c.Id='b'.repeat(64),c=>c.Config.Labels['sky-guide.task']='other',c=>c.HostConfig.NetworkMode='host',c=>c.HostConfig.PortBindings={'5432/tcp':[]},c=>c.HostConfig.Memory*=2,c=>c.Mounts[0].Source='C:/data',c=>c.Config.Env.push('POSTGRES_PASSWORD=bad')]){
  const bad=JSON.parse(JSON.stringify(container));mutate(bad);assert.throws(()=>verifyLocalContainer(bad,name,id))
 }
})
