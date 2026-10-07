import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Transport only. Dictionary codes reconstruct the EXACT original DO statement;
// a PostgreSQL SHA256 guard runs before EXECUTE. Original transaction, 30s cap,
// statements, data, deferred checks and internal timing boundaries stay unchanged.
// No batching/reordering, new DB object/extension or enforcement suppression.
const hash = text => createHash('sha256').update(text).digest('hex')
const literal = text => "'" + text.replaceAll("'", "''") + "'"
export function encodeText(text) {
 const alphabet=[...new Set(text)],dictionary=new Map(alphabet.map((c,n)=>[c,n])),codes=[]
 let word=''
 for(const character of text) {
  const joined=word+character
  if(dictionary.has(joined))word=joined
  else {
   codes.push(dictionary.get(word))
   if(dictionary.size<65536)dictionary.set(joined,dictionary.size)
   word=character
  }
 }
 if(word)codes.push(dictionary.get(word))
 const bytes=Buffer.alloc(codes.length*2)
 codes.forEach((code,n)=>bytes.writeUInt16BE(code,n*2))
 return {alphabet,codes,base64:bytes.toString('base64')}
}
export function decodeText({alphabet,codes}) {
 const words=[...alphabet],pieces=[]
 let previous=''
 for(const code of codes) {
  const piece=words[code]??(code===words.length&&previous?previous+[...previous][0]:null)
  if(piece===null)throw new Error('Invalid dictionary code')
  pieces.push(piece)
  if(previous&&words.length<65536)words.push(previous+[...piece][0])
  previous=piece
 }
 return pieces.join('')
}
export function packFullK15Rehearsal(sql) {
 const start=sql.indexOf('do $cost$'),last=sql.indexOf('end;$cost$;',start)
 if(start<0||last<0||!sql.includes("statement_timeout='30s'")||sql.includes('commit;'))throw new Error('Unexpected full K15 boundary')
 const body=sql.slice(start,last+'end;$cost$;'.length),prefix=sql.slice(0,start),suffix=sql.slice(last+'end;$cost$;'.length)
 if(!suffix.replace(/--[^\n]*/g,'').trimEnd().endsWith('rollback;'))throw new Error('Missing outer rollback')
 const encoded=encodeText(body)
 if(decodeText(encoded)!==body)throw new Error('Transport reconstruction differs from original SQL')
 const digest=hash(body)
 const wrapper=`do $packed_k15$ declare packed bytea:=decode(${literal(encoded.base64)},'base64');
 words text[]:=array[${encoded.alphabet.map(literal).join(',')}];pieces text[]:=array[]::text[];
 previous text:='';piece text;native_sql text;code integer;next_code integer:=${encoded.alphabet.length};offset_code integer;piece_count integer:=0;
 begin
 for offset_code in 0..(octet_length(packed)/2-1) loop
  code:=get_byte(packed,offset_code*2)*256+get_byte(packed,offset_code*2+1);
  piece:=words[code+1];
  if piece is null then
   if code<>next_code or previous='' then raise exception 'Invalid full K15 transport code';end if;
   piece:=previous||left(previous,1);
  end if;
  piece_count:=piece_count+1;pieces[piece_count]:=piece;
  if previous<>'' and next_code<65536 then words[next_code+1]:=previous||left(piece,1);next_code:=next_code+1;end if;
  previous:=piece;
 end loop;
 native_sql:=array_to_string(pieces,'');
 if encode(sha256(convert_to(native_sql,'UTF8')),'hex')<>'${digest}' then raise exception 'Full K15 reconstructed SQL hash differs';end if;
 execute native_sql;end;$packed_k15$;`
 const packed=prefix+wrapper+suffix
 const wireBytes=Buffer.byteLength(JSON.stringify({query:packed}))
 if(wireBytes>3_000_000)throw new Error('Packed native request remains too large')
 return {sql:packed,originalSha256:hash(sql),bodySha256:digest,bytes:Buffer.byteLength(packed),wireBytes,codes:encoded.codes.length,body}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2]||!process.argv[3])throw new Error('Provide original/packed E-drive fixture paths')
 const packed=packFullK15Rehearsal(readFileSync(process.argv[2],'utf8'))
 writeFileSync(process.argv[3],packed.sql)
 process.stdout.write(JSON.stringify({originalSha256:packed.originalSha256,bodySha256:packed.bodySha256,bytes:packed.bytes,wireBytes:packed.wireBytes,codes:packed.codes})+'\n')
}
