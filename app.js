(() => {
  "use strict";
  const DB_KEY = "dayflow_v1_data";
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const dateLabel = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(undefined,{day:"numeric",month:"short"}) : "";
  const defaultData = () => ({version:1,tasks:[],projects:[]});
  let data = loadData();
  let taskFilter = "all";
  let projectFilter = "all";
  let toastTimer;

  function loadData() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) return defaultData();
      return {version:1,tasks:parsed.tasks,projects:parsed.projects};
    } catch (error) {
      console.error("Could not load DAYFLOW data:", error);
      return defaultData();
    }
  }
  function saveData() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(data)); }
    catch (error) { toast("Could not save. Your browser storage may be full."); console.error(error); }
  }
  function toast(message) {
    const el=$("toast"); el.textContent=message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
  }
  function getTasksFor(date) { return data.tasks.filter(t=>t.date===date); }
  function completion(tasks) { return tasks.length ? Math.round(tasks.filter(t=>t.completed).length/tasks.length*100) : 0; }
  function setProgress(labelId,barId,tasks) {
    const pct=completion(tasks); $(labelId).textContent=`${pct}%`; $(barId).style.width=`${pct}%`;
  }
  function openDialog(id) { $(id).showModal(); }
  function closeDialog(id) { $(id).close(); }

  // Navigation
  function showView(name) {
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
    document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
    const titles={dashboard:"Dashboard",tasks:"Daily tasks",projects:"Projects",reports:"Reports",settings:"Settings"};
    $("pageTitle").textContent=titles[name]||"Dashboard";
    $("breadcrumbCurrent").textContent=(titles[name]||"Dashboard").toUpperCase();
    $("sidebar").classList.remove("open");
    if(name==="reports") renderReports();
    if(name==="projects") renderProjects();
    if(name==="tasks") renderTasksPage();
    if(name==="dashboard") renderDashboard();
  }
  document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
  $("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));

  // Tasks
  function taskFormOpen(task=null) {
    $("taskForm").reset();
    $("taskId").value=task?.id||"";
    $("taskDialogTitle").textContent=task?"Edit task":"Add a task";
    $("taskName").value=task?.name||"";
    $("taskDueDate").value=task?.date||$("taskDate").value||todayISO();
    $("taskPriority").value=task?.priority||"normal";
    $("taskNotes").value=task?.notes||"";
    openDialog("taskDialog");
    setTimeout(()=>$("taskName").focus(),50);
  }
  function saveTask(event) {
    event.preventDefault();
    const id=$("taskId").value;
    const task={id:id||uid(),name:$("taskName").value.trim(),date:$("taskDueDate").value,priority:$("taskPriority").value,notes:$("taskNotes").value.trim(),completed:false,createdAt: id ? (data.tasks.find(t=>t.id===id)?.createdAt||Date.now()) : Date.now(),completedAt:null};
    if(!task.name||!task.date) return;
    if(id) {
      const old=data.tasks.find(t=>t.id===id);
      task.completed=old?.completed||false; task.completedAt=old?.completedAt||null;
      data.tasks=data.tasks.map(t=>t.id===id?task:t);
    } else data.tasks.push(task);
    saveData(); closeDialog("taskDialog"); renderAll(); toast(id?"Task updated":"Task added");
  }
  function toggleTask(id,checked) {
    data.tasks=data.tasks.map(t=>t.id===id?{...t,completed:checked,completedAt:checked?Date.now():null}:t);
    saveData(); renderAll();
  }
  function deleteTask(id) {
    if(!confirm("Delete this task?")) return;
    data.tasks=data.tasks.filter(t=>t.id!==id); saveData(); renderAll(); toast("Task deleted");
  }
  function taskMarkup(task,compact=false) {
    return `<div class="task-row ${task.completed?"is-done":""}">
      <input class="task-check" type="checkbox" data-toggle-task="${escapeHTML(task.id)}" ${task.completed?"checked":""} aria-label="Mark ${escapeHTML(task.name)} completed">
      <div class="task-main"><div class="task-title">${escapeHTML(task.name)}</div>
      <div class="task-meta"><span class="priority ${escapeHTML(task.priority||"normal")}">${escapeHTML((task.priority||"normal").toUpperCase())}</span>${compact?"":`<span>${dateLabel(task.date)}</span>`}</div>
      ${!compact&&task.notes?`<div class="task-notes">${escapeHTML(task.notes)}</div>`:""}</div>
      <div class="row-actions"><button class="row-action" data-edit-task="${escapeHTML(task.id)}" aria-label="Edit task">✎</button><button class="row-action delete" data-delete-task="${escapeHTML(task.id)}" aria-label="Delete task">×</button></div>
    </div>`;
  }
  function bindTaskActions(root) {
    root.querySelectorAll("[data-toggle-task]").forEach(el=>el.addEventListener("change",()=>toggleTask(el.dataset.toggleTask,el.checked)));
    root.querySelectorAll("[data-edit-task]").forEach(el=>el.addEventListener("click",()=>{const t=data.tasks.find(x=>x.id===el.dataset.editTask);if(t)taskFormOpen(t);}));
    root.querySelectorAll("[data-delete-task]").forEach(el=>el.addEventListener("click",()=>deleteTask(el.dataset.deleteTask)));
  }
  function renderDashboardTasks() {
    const tasks=getTasksFor(todayISO()).sort((a,b)=>Number(a.completed)-Number(b.completed)||a.createdAt-b.createdAt);
    $("dashTaskList").innerHTML=tasks.slice(0,5).map(t=>taskMarkup(t,true)).join("");
    $("dashTaskEmpty").hidden=tasks.length>0;
    setProgress("dashProgressLabel","dashProgressBar",tasks);
    bindTaskActions($("dashTaskList"));
  }
  function renderTasksPage() {
    if(!$("taskDate").value) $("taskDate").value=todayISO();
    const date=$("taskDate").value;
    let tasks=getTasksFor(date).sort((a,b)=>Number(a.completed)-Number(b.completed)||a.createdAt-b.createdAt);
    if(taskFilter==="pending") tasks=tasks.filter(t=>!t.completed);
    if(taskFilter==="completed") tasks=tasks.filter(t=>t.completed);
    $("fullTaskList").innerHTML=tasks.map(t=>taskMarkup(t,false)).join("");
    const all=getTasksFor(date);
    $("taskPageEmpty").hidden=tasks.length>0;
    setProgress("taskPageProgress","taskPageProgressBar",all);
    $("taskPageSummary").textContent=`${all.filter(t=>t.completed).length} of ${all.length} tasks completed`;
    bindTaskActions($("fullTaskList"));
  }

  // Projects
  function projectFormOpen(project=null) {
    $("projectForm").reset();
    $("projectId").value=project?.id||"";
    $("projectDialogTitle").textContent=project?"Edit project":"Add a project";
    $("projectName").value=project?.name||"";
    $("projectDescription").value=project?.description||"";
    $("projectStatus").value=project?.status||"active";
    $("projectProgress").value=project?.progress??0;
    $("progressInputValue").textContent=`${project?.progress??0}%`;
    $("projectDeadline").value=project?.deadline||"";
    openDialog("projectDialog"); setTimeout(()=>$("projectName").focus(),50);
  }
  function saveProject(event) {
    event.preventDefault();
    const id=$("projectId").value;
    const project={id:id||uid(),name:$("projectName").value.trim(),description:$("projectDescription").value.trim(),status:$("projectStatus").value,progress:Number($("projectProgress").value),deadline:$("projectDeadline").value,createdAt:id?(data.projects.find(p=>p.id===id)?.createdAt||Date.now()):Date.now()};
    if(!project.name) return;
    if(project.status==="completed") project.progress=100;
    if(id) data.projects=data.projects.map(p=>p.id===id?project:p); else data.projects.push(project);
    saveData(); closeDialog("projectDialog"); renderAll(); toast(id?"Project updated":"Project added");
  }
  function deleteProject(id) {
    if(!confirm("Delete this project?")) return;
    data.projects=data.projects.filter(p=>p.id!==id); saveData(); renderAll(); toast("Project deleted");
  }
  function projectMarkup(p,card=false) {
    const statusLabel={active:"Active",paused:"On hold",completed:"Completed"}[p.status]||"Active";
    if(!card) return `<div class="project-row"><div class="project-monogram">${escapeHTML(p.name.slice(0,1).toUpperCase())}</div><div class="project-info"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.description||"No description yet")}</small><div class="tiny-progress"><span style="width:${p.progress}%"></span></div></div><span class="project-percent">${p.progress}%</span></div>`;
    return `<article class="project-card"><div class="project-card-top"><div class="project-monogram">${escapeHTML(p.name.slice(0,1).toUpperCase())}</div><div class="project-card-heading"><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.description||"No description added.")}</p></div><span class="status-pill ${escapeHTML(p.status)}">${statusLabel}</span></div><div class="project-card-progress"><div class="progress-label"><span>Progress</span><strong>${p.progress}%</strong></div><div class="progress-track"><div class="progress-value" style="width:${p.progress}%"></div></div></div><div class="project-card-footer"><span>${p.deadline?`Due ${dateLabel(p.deadline)}`:"No deadline"}</span><div class="project-card-actions"><button class="row-action" data-edit-project="${escapeHTML(p.id)}" aria-label="Edit project">✎</button><button class="row-action delete" data-delete-project="${escapeHTML(p.id)}" aria-label="Delete project">×</button></div></div></article>`;
  }
  function renderProjects() {
    let projects=[...data.projects].sort((a,b)=>b.createdAt-a.createdAt);
    if(projectFilter!=="all") projects=projects.filter(p=>p.status===projectFilter);
    $("fullProjectList").innerHTML=projects.map(p=>projectMarkup(p,true)).join("");
    $("projectPageEmpty").hidden=projects.length>0;
    $("fullProjectList").querySelectorAll("[data-edit-project]").forEach(b=>b.addEventListener("click",()=>{const p=data.projects.find(x=>x.id===b.dataset.editProject);if(p)projectFormOpen(p);}));
    $("fullProjectList").querySelectorAll("[data-delete-project]").forEach(b=>b.addEventListener("click",()=>deleteProject(b.dataset.deleteProject)));
  }
  function renderDashboardProjects() {
    const projects=data.projects.filter(p=>p.status==="active").sort((a,b)=>b.createdAt-a.createdAt);
    $("dashProjectList").innerHTML=projects.slice(0,4).map(p=>projectMarkup(p,false)).join("");
    $("dashProjectEmpty").hidden=projects.length>0;
  }

  // Canvas charts: drawn locally, no charting dependency.
  function drawBarChart(canvas, labels, completed, pending, compact=false) {
    if(!canvas) return;
    const rect=canvas.getBoundingClientRect(); const dpr=window.devicePixelRatio||1;
    const width=Math.max(rect.width,280), height=Math.max(rect.height,120);
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    const ctx=canvas.getContext("2d"); ctx.scale(dpr,dpr); ctx.clearRect(0,0,width,height);
    const styles=getComputedStyle(document.documentElement);
    const grid=styles.getPropertyValue("--border").trim()||"#2c3830";
    const muted=styles.getPropertyValue("--muted").trim()||"#8d9a90";
    const green=styles.getPropertyValue("--accent-strong").trim()||"#83b58d";
    const grey="#58645b";
    const max=Math.max(1,...labels.map((_,i)=>completed[i]+pending[i]));
    const left=compact?8:30, right=10, top=12, bottom=compact?24:34;
    const plotH=height-top-bottom, plotW=width-left-right;
    ctx.font=`${compact?9:10}px DM Sans, sans-serif`; ctx.textAlign="center";
    for(let i=0;i<4;i++){const y=top+plotH-(plotH*i/3);ctx.strokeStyle=grid;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();if(!compact){ctx.fillStyle=muted;ctx.textAlign="right";ctx.fillText(String(Math.round(max*i/3)),left-8,y+3);}}
    const slot=plotW/Math.max(labels.length,1), barW=Math.min(compact?18:30,slot*.55);
    labels.forEach((label,i)=>{
      const x=left+slot*i+(slot-barW)/2, total=completed[i]+pending[i];
      const doneH=(completed[i]/max)*plotH, pendH=(pending[i]/max)*plotH;
      ctx.fillStyle=grey;ctx.beginPath();ctx.roundRect(x,top+plotH-doneH-pendH,barW,pendH,3);ctx.fill();
      ctx.fillStyle=green;ctx.beginPath();ctx.roundRect(x,top+plotH-doneH,barW,doneH,3);ctx.fill();
      ctx.fillStyle=muted;ctx.textAlign="center";
      const shown=compact?label.slice(0,1):label;
      ctx.fillText(shown,x+barW/2,height-7);
    });
  }
  function weekData() {
    const labels=[],done=[],pending=[];
    for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;const tasks=getTasksFor(iso);labels.push(d.toLocaleDateString(undefined,{weekday:"short"}));done.push(tasks.filter(t=>t.completed).length);pending.push(tasks.filter(t=>!t.completed).length);}
    return {labels,done,pending};
  }
  function renderReports() {
    const days=Number($("reportRange").value||7), labels=[],done=[],pending=[];
    let total=0,completed=0,best={label:"—",count:-1};
    for(let i=days-1;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const tasks=getTasksFor(iso),c=tasks.filter(t=>t.completed).length,p=tasks.length-c;
      labels.push(days>14?`${d.getDate()}/${d.getMonth()+1}`:d.toLocaleDateString(undefined,{weekday:"short",day:"numeric"}));
      done.push(c);pending.push(p);total+=tasks.length;completed+=c;
      if(tasks.length&&c>best.count)best={label:d.toLocaleDateString(undefined,{weekday:"short",day:"numeric"}),count:c};
    }
    $("reportTotal").textContent=total;$("reportCompleted").textContent=completed;$("reportPending").textContent=total-completed;$("reportRate").textContent=`${total?Math.round(completed/total*100):0}%`;
    $("bestDay").textContent=best.count<0?"—":`${best.label} (${best.count})`;
    $("dailyAverage").textContent=(total/days).toFixed(1);$("reportProjects").textContent=data.projects.filter(p=>p.status==="active").length;
    drawBarChart($("reportChart"),labels,done,pending,false);
  }

  // Dashboard
  function renderDashboard() {
    const tasks=getTasksFor(todayISO()),completed=tasks.filter(t=>t.completed).length;
    $("dashTotal").textContent=tasks.length;$("dashCompleted").textContent=completed;$("dashPending").textContent=tasks.length-completed;
    $("dashProjects").textContent=data.projects.filter(p=>p.status==="active").length;
    const hour=new Date().getHours();$("greeting").textContent=hour<12?"Good morning, Kumar.":hour<17?"Good afternoon, Kumar.":"Good evening, Kumar.";
    renderDashboardTasks();renderDashboardProjects();
    const w=weekData();drawBarChart($("miniChart"),w.labels,w.done,w.pending,true);
  }
  function renderAll() { renderDashboard();renderTasksPage();renderProjects();if($("view-reports").classList.contains("active"))renderReports(); }

  // Backup and restore
  function exportData() {
    const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`dayflow-backup-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);toast("Backup exported");
  }
  async function importData(file) {
    if(!file)return;
    try {
      const parsed=JSON.parse(await file.text());
      if(!parsed||!Array.isArray(parsed.tasks)||!Array.isArray(parsed.projects))throw new Error("This file is not a valid DAYFLOW backup.");
      if(!confirm("Importing will replace the current DAYFLOW workspace. Continue?"))return;
      data={version:1,tasks:parsed.tasks,projects:parsed.projects};saveData();renderAll();toast("Backup restored successfully");
    } catch(error) { alert(error.message||"Could not read this backup."); }
    $("importInput").value="";
  }
  function clearWorkspace() {
    if(!confirm("This will permanently delete all tasks and projects stored by DAYFLOW in this browser. Continue?"))return;
    data=defaultData();saveData();renderAll();toast("Workspace cleared");
  }

  // Wire up controls
  $("dashAddTask").addEventListener("click",()=>taskFormOpen());
  $("addTaskButton").addEventListener("click",()=>taskFormOpen());
  $("taskForm").addEventListener("submit",saveTask);
  $("taskDate").value=todayISO();
  $("taskDate").addEventListener("change",renderTasksPage);
  $("taskFilters").querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{taskFilter=b.dataset.filter;$("taskFilters").querySelectorAll(".filter-tab").forEach(x=>x.classList.toggle("active",x===b));renderTasksPage();}));
  $("addProjectButton").addEventListener("click",()=>projectFormOpen());
  $("projectForm").addEventListener("submit",saveProject);
  $("projectProgress").addEventListener("input",e=>$("progressInputValue").textContent=`${e.target.value}%`);
  $("projectFilters").querySelectorAll("[data-project-filter]").forEach(b=>b.addEventListener("click",()=>{projectFilter=b.dataset.projectFilter;$("projectFilters").querySelectorAll(".filter-tab").forEach(x=>x.classList.toggle("active",x===b));renderProjects();}));
  $("reportRange").addEventListener("change",renderReports);
  $("exportButton").addEventListener("click",exportData);
  $("importInput").addEventListener("change",e=>importData(e.target.files[0]));
  $("clearButton").addEventListener("click",clearWorkspace);
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
  document.querySelectorAll(".modal").forEach(dialog=>dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();}));
  window.addEventListener("resize",()=>{if($("view-dashboard").classList.contains("active")){const w=weekData();drawBarChart($("miniChart"),w.labels,w.done,w.pending,true);}if($("view-reports").classList.contains("active"))renderReports();});

  // Initialize
  $("headerDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  renderAll();
})();