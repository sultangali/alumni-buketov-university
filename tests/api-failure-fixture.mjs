// Browser-only fixture: no Mongo connection and no writes. See tests/README.md.
import http from 'node:http'
const faculty = {id:'test-faculty',name:{ru:'Тестовый факультет'},depts:[],abbr:'ТЕСТ',est:2000,grad:'#123456'}
const bootstrap = {faculties:[faculty],alumni:[],teachers:[],laureates:[],veterans:[],teach:{}}
http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization')
  res.setHeader('Content-Type','application/json')
  if(req.method==='OPTIONS'){res.end('{}');return}
  if(req.url==='/api/bootstrap'){res.end(JSON.stringify(bootstrap));return}
  res.statusCode=503
  res.end(JSON.stringify({error:'TEST: service unavailable; nothing saved'}))
}).listen(4011,'127.0.0.1',()=>console.log('Read-only failure fixture http://127.0.0.1:4011'))
