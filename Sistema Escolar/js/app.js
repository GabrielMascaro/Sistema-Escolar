import { supabase } from "./supabase.js";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let user=null, profile=null, cache={};
const msg=(id,t)=>$(id).textContent=t||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(path,body){const {data:{session}}=await supabase.auth.getSession();const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify(body)});const j = await readJson(r);if(!r.ok)throw new Error(`Erro HTTP ${r.status}: ${j.error||JSON.stringify(j)}`);return j}
async function boot(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){$("#login").hidden=false;$("#app").hidden=true;return}
 user=session.user;
 const {data,error}=await supabase.from("perfis").select("*").eq("id",user.id).single();
 if(error)throw error;profile=data;
 $("#login").hidden=true;$("#app").hidden=false;$("#who").textContent=`${profile.nome} • ${profile.tipo}`;
 $("#admin").hidden=profile.tipo!=="admin";$("#teacher").hidden=profile.tipo!=="professor";$("#student").hidden=profile.tipo!=="aluno";
 if(profile.tipo==="admin")await loadAdmin();if(profile.tipo==="professor")await loadTeacher();if(profile.tipo==="aluno")await loadStudent();
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();msg("#loginMsg","Entrando...");try{const ident=$("#identificador").value.trim(),password=$("#senha").value; if(ident.includes("@")){const {error}=await supabase.auth.signInWithPassword({email:ident,password});if(error)throw error;}else{const r=await fetch("/api/login-aluno",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({matricula:ident,senha:password})});const j=await r.json();if(!r.ok)throw new Error(j.error);const {error}=await supabase.auth.setSession(j.session);if(error)throw error;}await boot()}catch(e){msg("#loginMsg",e.message)}});
$("#logout").onclick=async()=>{await supabase.auth.signOut();location.reload()};
$$("[data-tab]").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.hidden=true);$$("[data-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#tab-"+b.dataset.tab).hidden=false});
async function rows(table,cols="*"){const {data,error}=await supabase.from(table).select(cols);if(error)throw error;return data||[]}
function tableHTML(headers,rows){return `<table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x??""}</td>`).join("")}</tr>`).join("")}</tbody></table>`}
async function loadAdmin(){
 const [profiles,classes,subjects,enrolls,assigns,grades]=await Promise.all([rows("perfis"),rows("turmas"),rows("disciplinas"),rows("matriculas"),rows("professor_turmas"),rows("notas")]);
 cache={profiles,classes,subjects,enrolls,assigns,grades};
 $("#usersList").innerHTML=tableHTML(["Nome","Tipo","Matrícula / e-mail"],profiles.map(p=>[esc(p.nome),esc(p.tipo),esc(p.matricula||"—")]));
 $("#classesList").innerHTML=tableHTML(["Turma","Ano"],classes.map(c=>[esc(c.nome),c.ano_letivo]));
 $("#subjectsList").innerHTML=tableHTML(["Disciplina"],subjects.map(s=>[esc(s.nome)]));
 const students=profiles.filter(p=>p.tipo==="aluno"),teachers=profiles.filter(p=>p.tipo==="professor");
 $("#enrollStudent").innerHTML=students.map(p=>`<option value="${p.id}">${esc(p.nome)} (${esc(p.matricula||"")})</option>`).join("");
 $("#assignTeacher").innerHTML=teachers.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join("");
 const classOpts=classes.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join("");
 $("#enrollClass").innerHTML=classOpts;$("#assignClass").innerHTML=classOpts;
 $("#assignSubject").innerHTML=subjects.map(s=>`<option value="${s.id}">${esc(s.nome)}</option>`).join("");
 $("#enrollList").innerHTML=tableHTML(["Aluno","Turma"],enrolls.map(m=>[esc(students.find(p=>p.id===m.aluno_id)?.nome||m.aluno_id),esc(classes.find(c=>c.id===m.turma_id)?.nome||m.turma_id)]));
 $("#assignList").innerHTML=tableHTML(["Professor","Turma","Disciplina"],assigns.map(a=>[esc(teachers.find(p=>p.id===a.professor_id)?.nome||""),esc(classes.find(c=>c.id===a.turma_id)?.nome||""),esc(subjects.find(s=>s.id===a.disciplina_id)?.nome||"")]));
 $("#allGrades").innerHTML=tableHTML(["Aluno","Disciplina","Bimestre","Nota"],grades.map(g=>{const m=enrolls.find(x=>x.id===g.matricula_id);return [esc(students.find(p=>p.id===m?.aluno_id)?.nome||""),esc(subjects.find(s=>s.id===g.disciplina_id)?.nome||""),g.bimestre,g.nota]}));
}
$("#userForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api("/api/cadastrar-usuario",{nome:f.get("nome"),tipo:f.get("tipo"),identificador:f.get("identificador"),senha:f.get("senha")});msg("#userMsg","Usuário cadastrado.");e.target.reset();await loadAdmin()}catch(x){msg("#userMsg",x.message)}};
$("#classForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const {error}=await supabase.from("turmas").insert({nome:f.get("nome"),ano_letivo:Number(f.get("ano_letivo"))});if(error)throw error;e.target.reset();await loadAdmin()}catch(x){alert(x.message)}};
$("#subjectForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const {error}=await supabase.from("disciplinas").insert({nome:f.get("nome")});if(error)throw error;e.target.reset();await loadAdmin()}catch(x){alert(x.message)}};
$("#enrollForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const {error}=await supabase.from("matriculas").insert({aluno_id:f.get("aluno_id"),turma_id:Number(f.get("turma_id"))});if(error)throw error;await loadAdmin()}catch(x){alert(x.message)}};
$("#assignForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const {error}=await supabase.from("professor_turmas").insert({professor_id:f.get("professor_id"),turma_id:Number(f.get("turma_id")),disciplina_id:Number(f.get("disciplina_id"))});if(error)throw error;await loadAdmin()}catch(x){alert(x.message)}};
async function loadTeacher(){
 const [assigns,classes,subjects,enrolls,profiles]=await Promise.all([rows("professor_turmas"),rows("turmas"),rows("disciplinas"),rows("matriculas"),rows("perfis")]);
 cache={assigns:assigns.filter(a=>a.professor_id===user.id),classes,subjects,enrolls,profiles};
 const a=cache.assigns;$("#gradeClass").innerHTML=[...new Set(a.map(x=>x.turma_id))].map(id=>`<option value="${id}">${esc(classes.find(c=>c.id===id)?.nome||id)}</option>`).join("");
 $("#gradeSubject").innerHTML=[...new Set(a.map(x=>x.disciplina_id))].map(id=>`<option value="${id}">${esc(subjects.find(s=>s.id===id)?.nome||id)}</option>`).join("");
 $("#gradeClass").onchange=showGradeStudents;$("#gradeSubject").onchange=showGradeStudents;$("#gradeTerm").onchange=showGradeStudents;await showGradeStudents();
}
async function showGradeStudents(){
 const turma=Number($("#gradeClass").value),disc=Number($("#gradeSubject").value),bim=Number($("#gradeTerm").value);
 if(!turma||!disc)return;
 const ms=cache.enrolls.filter(m=>m.turma_id===turma);
 const {data:grades,error}=await supabase.from("notas").select("*").eq("disciplina_id",disc).eq("bimestre",bim);if(error)throw error;
 $("#gradeStudents").innerHTML=ms.map(m=>{const p=cache.profiles.find(x=>x.id===m.aluno_id),g=grades.find(x=>x.matricula_id===m.id);return `<label>${esc(p?.nome||"Aluno")}<input type="number" min="0" max="10" step="0.1" name="grade_${m.id}" data-matricula="${m.id}" value="${g?.nota??""}" placeholder="0 a 10"></label>`}).join("")||"<p>Nenhum aluno matriculado nesta turma.</p>";
}
$("#gradeForm").onsubmit=async e=>{e.preventDefault();try{const turma=Number($("#gradeClass").value),disc=Number($("#gradeSubject").value),bim=Number($("#gradeTerm").value);for(const input of $$("[data-matricula]")){if(input.value==="")continue;const nota=Number(input.value);if(nota<0||nota>10)throw new Error("As notas devem estar entre 0 e 10.");const {error}=await supabase.from("notas").upsert({matricula_id:Number(input.dataset.matricula),disciplina_id:disc,bimestre:bim,nota,professor_id:user.id},{onConflict:"matricula_id,disciplina_id,bimestre"});if(error)throw error;}msg("#gradeMsg","Notas salvas com sucesso.");}catch(x){msg("#gradeMsg",x.message)}};
async function loadStudent(){
 const {data:enrolls,error:e}=await supabase.from("matriculas").select("*").eq("aluno_id",user.id);if(e)throw e;
 const ids=enrolls.map(m=>m.id);let grades=[];
 if(ids.length){const {data,error}=await supabase.from("notas").select("*").in("matricula_id",ids);if(error)throw error;grades=data}
 const subjects=await rows("disciplinas");
 const by={};for(const g of grades){const s=subjects.find(x=>x.id===g.disciplina_id)?.nome||"Disciplina";(by[s]??=[])[g.bimestre]=g.nota}
 const names=Object.keys(by);$("#myReport").innerHTML=names.length?tableHTML(["Disciplina","1º bim.","2º bim.","3º bim.","4º bim.","Média parcial"],names.map(n=>{const a=by[n],vals=[1,2,3,4].map(i=>a[i]);const valid=vals.filter(v=>v!==undefined);const avg=valid.length?(valid.reduce((x,y)=>x+Number(y),0)/valid.length).toFixed(1):"—";return [esc(n),...vals.map(v=>v??"—"),avg]})):"<p>Seu boletim ainda não possui notas lançadas.</p>";
}
try{await boot()}catch(e){$("#login").hidden=false;msg("#loginMsg",e.message)}

async function readJson(response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            `Resposta inválida do servidor. HTTP ${response.status}: ${text.slice(0, 200)}`
        );
    }
}
