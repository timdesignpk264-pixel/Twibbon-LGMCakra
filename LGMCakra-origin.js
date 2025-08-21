/* =========================================================
   LGMCakra — Editor 7 Halaman (Final, BG Terkunci PNG)
   (Revisi: Skills Builder hanya di Page 1, instruksi = nama page)
   ========================================================= */
"use strict";

/* ---------- Elemen utama ---------- */
const stage   = document.getElementById('stage');
const bgImg   = document.getElementById('bgImg');
const inputs  = document.getElementById('inputsArea');
const labelPg = document.getElementById('labelPg');
const totalPg = document.getElementById('totalPg');
const pager   = document.getElementById('pager');
const btnPrev = document.getElementById('prev');
const btnNext = document.getElementById('next');

/* Kontrol FLOW (muncul hanya saat flow tidak dikunci) */
const flowCtr = {
  wrap:  document.getElementById('flowControls'),
  cols:  document.getElementById('fc_cols'),
  gap:   document.getElementById('fc_gap'),
  left:  document.getElementById('fc_left'),
  top:   document.getElementById('fc_top'),
  width: document.getElementById('fc_width'),
  padx:  document.getElementById('fc_padx'),
  pady:  document.getElementById('fc_pady'),
};

/* ---------- Util ---------- */
let cur = 0;
const k  = () => stage.clientWidth / 1080;   // skala (artboard 1080×1350)
function autoSizeTA(el){ el.style.height='auto'; el.style.height = el.scrollHeight + 'px'; }

// --- Halaman aktif berdasarkan jenjang ---
let ALLOWED_INDEXES = null; // contoh: [1] (hanya page-2), atau [1,2] (page-2 & 3)

// kembalikan daftar indeks halaman yang diizinkan (real index ke PAGES)
function getAllowed(){
  if (Array.isArray(ALLOWED_INDEXES) && ALLOWED_INDEXES.length) return ALLOWED_INDEXES;
  // default: semua halaman
  return PAGES.map((_,i)=>i);
}




/* ====== LIMIT PER BOX (sesuai brief) ====== */
const BOX_RULES = (() => {
  const map = (ids, r) => Object.fromEntries(ids.map(id => [id, r]));

  const p1 = map(['p1a','p1b','p1c','p1d'], { maxWords:85,  maxCharsNoSpace:406,  maxCharsWS:490  });
  const p2 = map(['p2a','p2b','p2c','p2d'], { maxWords:116, maxCharsNoSpace:546,  maxCharsWS:661  });
  const p3 = map(['p3a','p3b','p3c','p3d'], { maxWords:116, maxCharsNoSpace:546,  maxCharsWS:661  });
  const p4 = map(['p4a','p4b'],             { maxWords:179, maxCharsNoSpace:849,  maxCharsWS:1028 });
  const p5 = map(['p5a','p5b'],             { maxWords:179, maxCharsNoSpace:849,  maxCharsWS:1028 });
  const p6 = map(['p6a','p6b'],             { maxWords:254, maxCharsNoSpace:1218, maxCharsWS:1471 });

  return { ...p1, ...p2, ...p3, ...p4, ...p5, ...p6 };
})();

/* ====== Counter helpers ====== */
function countWords(t){ return (t||'').trim().split(/\s+/).filter(Boolean).length; }
function countCharsNoSpace(t){ return (t||'').replace(/\s+/g,'').length; }
function countCharsWS(t){ return (t||'').length; }

/* Aturan warna:
   - 'ok'   (hijau): words < (maxWords - 10)
   - 'near' (merah): (maxWords - 10) <= words <= maxWords
   - 'bad'  (merah): words > maxWords ATAU charsWS > maxCharsWS
*/
function classifyByRule(words, cNo, cWS, rule){
  if (!rule) return 'ok';
  if (words > rule.maxWords || cWS > rule.maxCharsWS) return 'bad';
  if (words >= (rule.maxWords - 10)) return 'near';
  return 'ok';
}
function renderCounterText(words, cNo, cWS, rule){
  if(!rule) return `${words} words • ${cNo} c(ns) • ${cWS} c(ws)`;
  const left = Math.max(0, rule.maxWords - words);
  return `${words}/${rule.maxWords} words (${left} left) • ${cNo}/${rule.maxCharsNoSpace} c(ns) • ${cWS}/${rule.maxCharsWS} c(ws)`;
}

/* ====== Toolbar insert helpers ====== */
function getCaret(el){ return { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }; }
function setCaret(el, pos){ try{ el.focus(); el.setSelectionRange(pos,pos); }catch(_){} }
function insertAtCursor(el, text, moveToEnd=true){
  const {start,end} = getCaret(el);
  el.value = el.value.slice(0,start) + text + el.value.slice(end);
  setCaret(el, moveToEnd ? (start + text.length) : start);
  el.dispatchEvent(new Event('input',{bubbles:true}));
}
function insertParagraph(el){
  const prefix = (el.value && !el.value.endsWith('\n')) ? '\n\n' : '\n\n';
  insertAtCursor(el, prefix);
}
function insertBullets(el){
  const tpl = (el.value && !el.value.endsWith('\n') ? '\n' : '') + `• Poin utama\n• Poin penting\n• Dampak terukur\n`;
  insertAtCursor(el, tpl);
}
function insertNumbered(el){
  const tpl = (el.value && !el.value.endsWith('\n') ? '\n' : '') + `1) Langkah 1\n2) Langkah 2\n3) Hasil\n`;
  insertAtCursor(el, tpl);
}

/* ====== Inject CSS kecil untuk warna counter (sekali saja) ====== */
(function ensureCounterCSS(){
  if (document.getElementById('counter-inline-style')) return;
  const style = document.createElement('style');
  style.id = 'counter-inline-style';
  style.textContent = `
    .mini.counter{ font-size:.85rem; margin-top:.25rem; opacity:.95 }
    .mini.counter.ok{ color:#198754 }        /* hijau */
    .mini.counter.near{ color:#dc3545 }      /* merah saat tinggal ≤10 kata */
    .mini.counter.bad{ color:#dc3545; font-weight:600 } /* merah tebal: overload */
    .fmt-bar{ display:flex; gap:.5rem; margin:.25rem 0 .5rem }
    .fmt-bar .btn{ padding:.15rem .5rem }
  `;
  document.head.appendChild(style);
})();

/* ---------- Palet warna (override via style per halaman) ---------- */
const COLOR = {
  titleDefault:  '#2e6368', // deep teal (backup)
  titleText:     '#daa520', // goldenrod (backup)
  bodyDefault:   '#f6e6c5', // beige (backup)
  titleMulberry: '#61313e', // untuk Life Grand Map
  titleTextGold: '#f7c64b', // teks emas
  bodySelf:      '#e8c0b3', // body khusus halaman Self
};

/* ---------- Path BG ---------- */
const FRAME_BASE = './';              // ganti jika PNG di folder lain
const withBase = (name) => FRAME_BASE + name;

/* Error load BG */
bgImg.addEventListener('error', () => {
  console.error('[BG ERROR] Gagal memuat:', bgImg?.src);
  alert('Background tidak ditemukan:\n' + bgImg?.src + '\n\nCek nama file & path-nya.');
});

/* ---------- Frames (PNG) ---------- */
const FRAME = {
  1: withBase('frame-02.png'), // Self Potential
  2: withBase('frame-03.png'), // Study Plan (1–4)
  3: withBase('frame-04.png'), // Study Plan (5–8)
  4: withBase('frame-05.png'), // Life Grand Map (2025–2035)
  5: withBase('frame-06.png'), // Life Grand Map (2035–Beyond)
  6: withBase('frame-07.png'), // Grand Goals & Plans
  7: withBase('frame-08.png'), // Cover/Akhir
};

/* ---------- PAGES: Setting lokasi per halaman (with revised, word-limited content) ---------- */
const PAGES = [
  /* 1) SELF POTENTIAL — flow 1 kolom (manual, locked) */
  { name:"Self Potential & Development Identification", type:'flow', bg: FRAME[1],
    flow:{
      cols:1, gapPct:1, leftPct:5.5, topPct:23, widthPct:89.5, padXPct:0, padYPct:0,
      lock:true, anchor:{ mode:'manual' }
    },
    boxes:[
      { id:"p1a", label:"Skill 1", fs:20, lh:1.35,
        val:"I have proven leadership from leading a university research project coordinating five members. I assigned tasks, facilitated weekly discussions, and gave constructive feedback. My ability to motivate the team and align goals ensured successful completion, even under tight deadlines. I thrive on bringing people together to achieve results. For me, leadership means enabling others to succeed, and I take pride in fostering an environment where collaboration, trust, and shared commitment lead to outcomes greater than individual efforts.",
        style:{ bodyBg: COLOR.bodySelf }
      },
      { id:"p1b", label:"Skill 2", fs:20, lh:1.35,
        val:"Collaboration defines my work ethic. I actively join cross-functional teamwork, such as developing a community app with IT and marketing. Through assertive communication and active listening, I resolve conflicts and value mutual respect. For me, teamwork generates synergy where ideas merge and strengths combine. I believe groups achieve more than individuals alone. I am motivated by the energy of shared effort, and I continuously seek opportunities where collective creativity leads to impactful and innovative outcomes beyond expectations.",
        style:{ bodyBg: COLOR.bodySelf }
      },
      { id:"p1c", label:"Skill 3", fs:20, lh:1.35,
        val:"I sharpen critical thinking through complex case studies. I synthesize literature, identify assumptions, and evaluate risks to form clear strategies. My process builds a solid framework before choosing solutions. This enables me to deliver recommendations that are logical, practical, and actionable. I enjoy turning complex challenges into structured insights, making decisions grounded in analysis. This ability to simplify complexity into clarity drives my passion for problem-solving and equips me to guide others with reasoned perspectives.",
        style:{ bodyBg: COLOR.bodySelf }
      },
      { id:"p1d", label:"Skill 4", fs:20, lh:1.35,
        val:"I am naturally adaptive and a quick learner. When my company introduced a new project management system, I quickly mastered it and trained colleagues. I eagerly learn new tools and stay flexible when priorities shift. My ability to stay calm and productive during dynamic changes ensures consistent performance. I pride myself on resilience, embracing change as an opportunity to grow and excel. Adaptability allows me to thrive under uncertainty while supporting others through transitions smoothly.",
        style:{ bodyBg: COLOR.bodySelf }
      },
    ]
  },

  /* 2) STUDY PLAN (1–4) — flow 2 kolom (manual, locked) */
  { name:"Study Plan & Academic Achievement (1–4)", type:'flow', bg: FRAME[2],
    flow:{
      cols:2, gapPct:2, leftPct:4, topPct:21, widthPct:93, padXPct:2, padYPct:2,
      lock:true, anchor:{ mode:'manual' }
    },
    boxes:[
      { id:"p2a", label:"1st Term", fs:20, lh:1.35,
        val:"In my first semester, I will build a strong academic foundation by focusing on core courses such as Advanced Quantitative Methods. My target GPA is 3.80. I will actively participate in class discussions, begin exploring dissertation topics, and complete one literature review article suitable for a national journal publication. This first publication will mark the start of my academic contributions and research journey. I also aim to enhance my academic writing skills and strengthen relationships with professors and peers for future collaborations. These early steps will provide a strong base, preparing me for advanced research while ensuring I contribute meaningfully to the academic community from the very beginning."
      },
      { id:"p2b", label:"2nd Term", fs:20, lh:1.35,
        val:"In the second semester, I will narrow my research focus to digital sociology, specifically the impact of social media on political polarization. I will choose electives such as Social Network Analysis and Digital Research Ethics. I will design a detailed research roadmap, including qualitative case study methodology, and begin small-scale pilot testing. Regular consultations with my advisor will ensure research quality and provide guidance on refining ideas. I also plan to engage in academic seminars and workshops to receive feedback and improve rigor. By combining strong coursework, methodological training, and peer engagement, I will establish a firm foundation to advance confidently toward a comprehensive dissertation proposal in later semesters."
      },
      { id:"p2c", label:"3rd Term", fs:20, lh:1.35,
        val:"In the third semester, I will deepen my research through preliminary studies and interviews with selected participants. I aim to sharpen analytical skills and enhance data collection techniques. Additionally, I will seek opportunities to work as a research assistant or join postgraduate research communities. Such activities will expand my academic network and expose me to diverse perspectives, fostering valuable collaborations. I will also begin drafting an article based on early findings to submit to a national-level journal, testing the academic significance of my research. By balancing academic coursework, active research involvement, and extracurricular collaboration, I will strengthen my readiness to transition into the dissertation proposal stage effectively."
      },
      { id:"p2d", label:"4th Term", fs:20, lh:1.35,
        val:"My fourth semester goal is to finalize a solid, approved dissertation proposal. Alongside, I will write a scholarly article from initial findings to submit to an international sociology conference. I also plan to participate in essay competitions, both nationally and internationally, to test my arguments in wider academic forums. These opportunities will allow me to receive valuable feedback from experts and peers. By the end of this semester, I aim to refine my research focus, secure approval for the dissertation plan, and strengthen academic visibility through publications and competitions, setting a clear path toward impactful, high-quality doctoral research for the remainder of my study program."
      },
    ]
  },

  /* 3) STUDY PLAN (5–8) — flow 2 kolom (manual, locked) */
  { name:"Study Plan & Academic Achievement (5–8)", type:'flow', bg: FRAME[3],
    flow:{
      cols:2, gapPct:2, leftPct:4, topPct:21, widthPct:93, padXPct:2, padYPct:2,
      lock:true, anchor:{ mode:'manual' }
    },
    boxes:[
      { id:"p3a", label:"5th Term", fs:20, lh:1.35,
        val:"In the fifth semester, I will finalize my dissertation proposal and begin primary data collection. My plan involves conducting in-depth interviews, surveys, and initial data analysis. Simultaneously, I will submit an article to a Scopus-indexed journal, ensuring steady publication output. To strengthen theoretical grounding, I will attend a capita selecta seminar. This semester will be crucial in transitioning from preparation to execution, where I collect reliable data and refine methods. By combining rigorous data collection with continuous publication, I will create a strong balance between dissertation progress and academic contributions, establishing momentum for later phases where the quality of data and analysis becomes central to dissertation success."
      },
      { id:"p3b", label:"6th Term", fs:20, lh:1.35,
        val:"In the sixth semester, I will focus entirely on advanced data analysis. I will apply both qualitative and quantitative methods using NVivo and SPSS, aiming to generate robust findings. I will begin drafting dissertation chapters on results and discussion, integrating empirical evidence with theoretical insights. In parallel, I will prepare a journal article for submission to a high-impact international outlet. This article will represent the first major contribution of my dissertation. I will also engage in peer workshops to present my findings and receive constructive feedback. Through this combination of analysis, writing, and scholarly engagement, I will ensure my dissertation advances significantly and remains aligned with high academic standards."
      },
      { id:"p3c", label:"7th Term", fs:20, lh:1.35,
        val:"In the seventh semester, my top priority will be refining the dissertation manuscript. I will work closely with my supervisor, addressing all feedback to ensure clarity and rigor. The key milestone will be submitting my primary article to a Q1 or Q2 international journal. I will also revise previously submitted papers, responding to reviewer comments to secure publication. This process will strengthen my academic profile and demonstrate my persistence in scholarly communication. By the end of this semester, I aim to have a near-final version of my dissertation, integrating all research insights and establishing a clear narrative that highlights originality, academic contribution, and relevance to pressing social issues."
      },
      { id:"p3d", label:"8th Term", fs:20, lh:1.35,
        val:"In the eighth and final semester, I will focus on finalizing the dissertation and preparing for the defense. I will integrate all chapters into a coherent manuscript and rehearse presentations to defend effectively. Following the defense, I plan to disseminate findings widely by presenting at national seminars and publishing summaries in practitioner-focused outlets. I will also begin planning to adapt my dissertation into a book or series of articles for broader audiences. My objective is to ensure that my research has both academic and societal impact, reaching policymakers, educators, and the public. This final semester will be about consolidating achievements and transitioning toward impactful academic leadership."
      },
    ]
  },

  /* 4) LIFE GRAND MAP (2025–2035) — flow 2 kolom */
  { name:"Life Grand Map (2025–2035)", type:'flow', bg: FRAME[4],
    flow:{
      cols:2, gapPct:2, leftPct:4, topPct:37, widthPct:93, padXPct:2, padYPct:2,
      lock:true, anchor:{ mode:'manual' }
    },
    boxes:[
      { id:"p4a", label:"2025 – 2030", fs:22, lh:1.35,
        val:"In the next decade, I aim to establish myself as a productive academic and researcher at a leading Indonesian university. My focus will be educational technology, with a specialization in developing adaptive learning platforms for underserved regions. I will actively pursue national and international research grants to fund innovative projects that address disparities in education. Beyond research, I will build collaborations with experts, practitioners, and policymakers to ensure that my work has both academic significance and practical impact. I also plan to supervise postgraduate students, creating a pipeline of young scholars passionate about educational innovation. Participation in international conferences will help me showcase Indonesian research globally and foster cross-country collaborations. By 2035, I envision myself recognized not only for scholarly contributions but also for tangible solutions that improve educational access and quality in marginalized areas. This blend of research, mentorship, and real-world impact will define my identity as a scholar committed to advancing Indonesia’s role in global education discourse.",
        style:{ titleBg: COLOR.titleMulberry, titleColor: COLOR.titleTextGold }
      },
      { id:"p4b", label:"2030 – 2035", fs:22, lh:1.35,
        val:"Career-wise, I aspire to achieve the rank of Associate Professor within ten years. This milestone reflects both academic output and service to society. My academic contributions will include publishing in top-tier journals, supervising theses, and developing innovative courses that prepare students for 21st-century challenges. For community service, I will lead teacher training programs focused on digital literacy, equipping educators with essential skills for integrating technology effectively. Collaborating with the Ministry of Education, I will contribute to evidence-based policymaking, ensuring that policies are grounded in research. I will also write policy briefs and participate in public discussions to bridge academia and society. At the university level, I will take leadership roles to improve research culture, promote interdisciplinary projects, and mentor junior colleagues. Becoming an Associate Professor is more than a title; it is a platform from which I can influence education policy, expand knowledge, and empower the next generation of academics and practitioners to create sustainable change.",
        style:{ titleBg: COLOR.titleMulberry, titleColor: COLOR.titleTextGold }
      },
    ]
  },

  /* 5) LIFE GRAND MAP (2035–Beyond) — flow 2 kolom */
  { name:"Life Grand Map (2035–Beyond)", type:'flow', bg: FRAME[5],
    flow:{
      cols:2, gapPct:2, leftPct:4, topPct:37, widthPct:93, padXPct:2, padYPct:2,
      lock:true, anchor:{ mode:'manual' }
    },
    boxes:[
      { id:"p5a", label:"2035 – 2040", fs:22, lh:1.35,
        val:"Looking beyond 2035, my ambition is to hold a strategic national role, such as serving on the national research council or leading an educational research institute. In such a position, I will influence research priorities and innovation policies for Indonesia’s education sector. My advocacy will focus on strengthening international collaborations, securing funding for transformative research, and promoting digital equity. I want to ensure that educational research addresses real problems, from access inequalities to curriculum innovation. By leveraging my expertise, I will guide resource allocation toward initiatives that genuinely improve learning outcomes. I also aspire to mentor emerging scholars at the national level, shaping the future of educational research. This long-term role will allow me to influence policy direction, improve education standards, and position Indonesia as a leader in educational innovation in Southeast Asia. Ultimately, this responsibility aligns with my commitment to ensuring that research not only advances knowledge but also creates meaningful societal progress.",
        style:{ titleBg: COLOR.titleMulberry, titleColor: COLOR.titleTextGold }
      },
      { id:"p5b", label:"2040 – Beyond", fs:22, lh:1.35,
        val:"My ultimate aspiration is to leave a legacy through an inclusive, technology-based educational model adopted nationally and recognized globally. This model will use adaptive technologies to personalize learning while ensuring accessibility for disadvantaged students. I want to be remembered as an innovator who expanded educational opportunity for millions of Indonesian children regardless of background. To reach this goal, I will produce publications in high-impact journals, present keynote addresses at major international conferences, and collaborate with organizations such as UNESCO to scale innovations. Beyond academia, I will influence educational practices by consulting for governments and NGOs on digital education strategies. I envision contributing to a future where Indonesian innovation inspires global education reform. This dream motivates my daily efforts, pushing me to transform research into practical systems that address inequality. By dedicating my life to this mission, I hope to leave a transformative impact on education, ensuring knowledge becomes a bridge to opportunity for every child.",
        style:{ titleBg: COLOR.titleMulberry, titleColor: COLOR.titleTextGold }
      },
    ]
  },

  /* 6) GRAND GOALS & PLANS — flow 1 kolom */
  { name:"Grand Goals & Plans", type:'flow', bg: FRAME[6],
    flow:{
      cols:1, gapPct:3, leftPct:4, topPct:21, widthPct:93, padXPct:2, padYPct:2,
      lock:true, anchor:{ mode:'manual' }
    },
    boxes:[
      { id:"p6a", label:"Contribution Plans", fs:24, lh:1.36,
        val:"My national contribution will rest on three main pillars. First, for communities, I will create technological solutions addressing disparities in frontier, outermost, and disadvantaged regions. Projects may include mobile-based learning platforms and teacher support systems adapted for remote contexts. Second, for my field of science, I will consistently publish in top international journals, advancing knowledge in educational software engineering and putting Indonesia on the global research map. I will also build collaborations across disciplines, ensuring that innovations are interdisciplinary and relevant. Third, for the nation, I aspire to participate actively in policymaking, particularly in shaping regulations that encourage innovation and technology adoption in education. By serving as a bridge between academia, industry, and government, I will ensure Indonesia’s education system evolves with global trends. This threefold contribution—community empowerment, scientific advancement, and national policy engagement—will define my professional mission, positioning me as a leader who not only advances knowledge but also ensures it directly benefits society and strengthens Indonesia’s global competitiveness."
      },
      { id:"p6b", label:"Personal Grand Plans", fs:24, lh:1.36,
        val:"Outside of professional life, my personal goals focus on achieving balance and lasting happiness. I want to build a harmonious family environment and serve as a role model for my children, teaching them integrity, perseverance, and kindness. Spiritually, I will continue to deepen my religious practice as a foundation for moral guidance and inner peace. I strongly believe that personal well-being fuels professional excellence, which is why I advocate for maintaining work-life balance. I will dedicate time to hobbies such as mountain hiking, reading literature, and cultural exploration, which nurture creativity and reduce stress. Through these activities, I can remain grounded and inspired. I will also give back to society through voluntary activities, such as mentoring youth or supporting community projects. For me, true success is measured not only by career achievements but by the ability to live a meaningful and fulfilling life. Achieving harmony between professional success and personal joy will be my ultimate pursuit." 
      },
    ]
  },


  /* 7) COVER — tanpa input */
  { name:"CAKRA NAWASENA — Cover", type:'abs', bg: FRAME[7], boxes:[] },
];

/* ---------- Instruksi per halaman (copywriting) ---------- */
const PAGE_INSTR = [];

/* ---------- Pager ---------- */
function buildPager(){
  pager.innerHTML = '';
  const allowed = getAllowed();
  allowed.forEach((realIx, logicalIx)=>{
    const li = document.createElement('li'); li.className='nav-item';
    const a  = document.createElement('button');
    a.type='button';
    a.className='nav-link';
    a.title = PAGES[realIx]?.name || `Page ${realIx+1}`;
    a.textContent = logicalIx + 1;     // nomor urut logis
    a.addEventListener('click', ()=> renderPage(realIx)); // kirim real index
    li.appendChild(a); pager.appendChild(li);
  });
  if (totalPg) totalPg.textContent = allowed.length;
}

/* ---------- Show/Hide Skills Builder hanya di Halaman 1 ---------- */
function toggleSkillsBuilder(pageIndex){
  const sb = document.getElementById('skillsBuilder');
  if (!sb) return;
  sb.classList.toggle('d-none', pageIndex !== 0); // tampil hanya index 0
}

/* ---------- Render ---------- */
function renderPage(i){
  // i = real index di dalam PAGES
  cur = i; // simpan real index sebagai current

  // nomor label berdasarkan posisi logis (urutan di allowed)
  const allowed = getAllowed();
  const logicalPos = Math.max(0, allowed.indexOf(cur));
  if (labelPg) labelPg.textContent = logicalPos + 1;

  // Tampilkan nama halaman dari definisi PAGES
  const inst = document.getElementById('pageInstruction');
  if (inst) inst.textContent = PAGES[i]?.name || "";

  // BG dari definisi PAGES + fallback
  const src = PAGES[i].bg || '';
  bgImg.src = src || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>';

  // bersihkan overlay & form
  stage.querySelectorAll('.overlay-abs, .flow-wrap').forEach(n=>n.remove());
  inputs.innerHTML='';

  if (PAGES[i].type==='abs'){
    /* ---------- ABS ---------- */
    flowCtr.wrap.classList.add('d-none');

    const s = k();
    PAGES[i].boxes.forEach(b=>{
      const el = document.createElement('div');
      el.className='overlay-abs box';
      el.style.left  = (b.x*s)+'px';
      el.style.top   = (b.y*s)+'px';
      el.style.width = (b.w*s)+'px';
      el.style.fontSize = (b.fs*s)+'px';
      el.style.lineHeight = b.lh;

      const st = b.style||{};
      if (st.shadow)     el.style.setProperty('--shadow', st.shadow);
      if (st.titleBg)    el.style.setProperty('--title-bg', st.titleBg);
      if (st.titleColor) el.style.setProperty('--title-color', st.titleColor);
      if (st.bodyBg)     el.style.setProperty('--body-bg', st.bodyBg);
      if (st.bodyBorder) el.style.setProperty('--body-border', st.bodyBorder);
      if (st.bodyPadX!==undefined)   el.style.setProperty('--body-pad-x', (st.bodyPadX*s)+'px');
      if (st.bodyPadY!==undefined)   el.style.setProperty('--body-pad-y', (st.bodyPadY*s)+'px');
      if (st.height)                 el.style.height = (st.height*s)+'px';

      const title = document.createElement('div');
      title.className='box-title';
      title.textContent = b.label;

      const out = document.createElement('div');
      out.className='box-body';
      out.id = `out_${b.id}`;
      out.textContent = b.val || '';

      el.append(title, out);
      stage.appendChild(el);

      // input kiri + toolbar + counter (ABS)
      const grp=document.createElement('div');
      grp.className='mb-3';
      grp.innerHTML = `
        <label class="form-label">${b.label}</label>
        <div class="fmt-bar">
          <button type="button" class="btn btn-outline-secondary btn-sm fmt-para">¶ Paragraf</button>
          <button type="button" class="btn btn-outline-secondary btn-sm fmt-bullets">• Bullets</button>
          <button type="button" class="btn btn-outline-secondary btn-sm fmt-num">1. Numbered</button>
        </div>
        <textarea id="in_${b.id}" class="form-control" rows="6" placeholder="Tulis konten..."></textarea>
        <div id="cnt_${b.id}" class="mini counter"></div>
        <div class="mini">x:${b.x}, y:${b.y}, w:${b.w}, fs:${b.fs}</div>`;
      inputs.appendChild(grp);

      const ta = grp.querySelector('textarea');
      const cnt= grp.querySelector(`#cnt_${b.id}`);
      const rule = BOX_RULES[b.id] || null;

      ta.value = b.val || '';
      autoSizeTA(ta);

      // set counter awal
      {
        const w = countWords(ta.value), cNo = countCharsNoSpace(ta.value), cWS = countCharsWS(ta.value);
        cnt.textContent = renderCounterText(w,cNo,cWS,rule);
        cnt.className = 'mini counter ' + classifyByRule(w,cNo,cWS,rule);
      }

      ta.addEventListener('input', e=>{
        b.val = e.target.value;
        const outEl = document.getElementById('out_'+b.id);
        if(outEl) outEl.textContent = b.val;
        autoSizeTA(e.target);

        const w = countWords(b.val), cNo = countCharsNoSpace(b.val), cWS = countCharsWS(b.val);
        cnt.textContent = renderCounterText(w,cNo,cWS,rule);
        cnt.className = 'mini counter ' + classifyByRule(w,cNo,cWS,rule);
      });

      // toolbar actions
      grp.querySelector('.fmt-para')  .addEventListener('click', ()=> insertParagraph(ta));
      grp.querySelector('.fmt-bullets').addEventListener('click', ()=> insertBullets(ta));
      grp.querySelector('.fmt-num')   .addEventListener('click', ()=> insertNumbered(ta));
    });

  } else {
    /* ---------- FLOW ---------- */
    const f = PAGES[i].flow;

    // tampilkan flow controls kalau tidak lock
    if (f.lock) flowCtr.wrap.classList.add('d-none');
    else        flowCtr.wrap.classList.remove('d-none');

    // sinkron nilai kontrol (meski hidden)
    flowCtr.cols.value=f.cols; flowCtr.gap.value=f.gapPct; flowCtr.left.value=f.leftPct;
    flowCtr.top.value=f.topPct; flowCtr.width.value=f.widthPct; flowCtr.padx.value=f.padXPct; flowCtr.pady.value=f.padYPct;

    // anchor first-box-xy akan menonaktifkan left/top (di sini kita manual semua, jadi tidak aktif)
    flowCtr.left.disabled = !!(f.anchor && f.anchor.mode==='first-box-xy');
    flowCtr.top.disabled  = !!(f.anchor && f.anchor.mode==='first-box-xy');

    const s = k();
    const toPxW=p=> (p*10.8*s)+'px';
    const toPxH=p=> (p*13.5*s)+'px';

    // hitung posisi area flow
    let leftPx  = toPxW(f.leftPct);
    let topPx   = toPxH(f.topPct);

    if (f.anchor && f.anchor.mode==='first-box-xy' && PAGES[i].boxes?.[f.anchor.boxIndex||0]){
      const b0 = PAGES[i].boxes[f.anchor.boxIndex||0];
      if (typeof b0.x==='number' && typeof b0.y==='number') {
        leftPx = (b0.x * s) + 'px';
        topPx  = (b0.y * s) + 'px';
      }
    }

    const wrap=document.createElement('div');
    wrap.className='flow-wrap';
    wrap.style.setProperty('--cols',   f.cols);
    wrap.style.setProperty('--gap-px', toPxW(f.gapPct));
    wrap.style.setProperty('--padX-px',toPxW(f.padXPct));
    wrap.style.setProperty('--padY-px',toPxH(f.padYPct));
    wrap.style.setProperty('--left-px',leftPx);
    wrap.style.setProperty('--top-px', topPx);
    wrap.style.setProperty('--w-px',   toPxW(f.widthPct));

    PAGES[i].boxes.forEach(b=>{
      const card=document.createElement('div');
      card.className='box';
      card.style.fontSize=(b.fs*s)+'px';
      card.style.lineHeight=b.lh;

      const st = b.style||{};
      if (st.shadow)     card.style.setProperty('--shadow', st.shadow);
      if (st.titleBg)    card.style.setProperty('--title-bg', st.titleBg);
      if (st.titleColor) card.style.setProperty('--title-color', st.titleColor);
      if (st.bodyBg)     card.style.setProperty('--body-bg', st.bodyBg);
      if (st.bodyBorder) card.style.setProperty('--body-border', st.bodyBorder);
      if (st.bodyPadX!==undefined)   card.style.setProperty('--body-pad-x', (st.bodyPadX*s)+'px');
      if (st.bodyPadY!==undefined)   card.style.setProperty('--body-pad-y', (st.bodyPadY*s)+'px');

      const title = document.createElement('div');
      title.className='box-title';
      title.textContent = b.label;

      const out = document.createElement('div');
      out.className='box-body';
      out.id = `out_${b.id}`;
      out.textContent = b.val || '';

      card.append(title, out);
      wrap.appendChild(card);

      // input kiri + toolbar + counter (FLOW)
      const grp=document.createElement('div');
      grp.className='mb-3';
      grp.innerHTML = `
        <label class="form-label">${b.label}</label>
        <div class="fmt-bar">
          <button type="button" class="btn btn-outline-secondary btn-sm fmt-para">¶ Paragraf</button>
          <button type="button" class="btn btn-outline-secondary btn-sm fmt-bullets">• Bullets</button>
          <button type="button" class="btn btn-outline-secondary btn-sm fmt-num">1. Numbered</button>
        </div>
        <textarea id="in_${b.id}" class="form-control" rows="6" placeholder="Tulis konten..."></textarea>
        <div id="cnt_${b.id}" class="mini counter"></div>
      `;
      inputs.appendChild(grp);

      const ta=grp.querySelector('textarea');
      const cnt=grp.querySelector(`#cnt_${b.id}`);
      const rule = BOX_RULES[b.id] || null;

      ta.value = b.val || '';
      autoSizeTA(ta);

      // set counter awal
      {
        const w = countWords(ta.value), cNo = countCharsNoSpace(ta.value), cWS = countCharsWS(ta.value);
        cnt.textContent = renderCounterText(w,cNo,cWS,rule);
        cnt.className = 'mini counter ' + classifyByRule(w,cNo,cWS,rule);
      }

      // live sync
      ta.addEventListener('input', e=>{
        b.val=e.target.value;
        const outEl=document.getElementById('out_'+b.id);
        if(outEl) outEl.textContent=b.val;
        autoSizeTA(e.target);

        const w = countWords(b.val), cNo = countCharsNoSpace(b.val), cWS = countCharsWS(b.val);
        cnt.textContent = renderCounterText(w,cNo,cWS,rule);
        cnt.className = 'mini counter ' + classifyByRule(w,cNo,cWS,rule);
      });

      // toolbar actions
      grp.querySelector('.fmt-para')  .addEventListener('click', ()=> insertParagraph(ta));
      grp.querySelector('.fmt-bullets').addEventListener('click', ()=> insertBullets(ta));
      grp.querySelector('.fmt-num')   .addEventListener('click', ()=> insertNumbered(ta));
    });

    stage.appendChild(wrap);
  }

  // highlight pager aktif
  const allowedForHL = getAllowed(); // daftar real index
  pager.querySelectorAll('button.nav-link').forEach((a,idx)=>{
    const realIx = allowedForHL[idx];
    const on = realIx === i;
    a.classList.toggle('active', on);
    a.classList.toggle('text-white', on);
  });

  // tampilkan/ sembunyikan Skills Builder
  toggleSkillsBuilder(i);
}

/* ---------- Kontrol FLOW (debounce) ---------- */
let reT=null;
const rerender = () => { clearTimeout(reT); reT = setTimeout(()=>renderPage(cur), 150); };
['cols','gap','left','top','width','padx','pady'].forEach(key=>{
  const map = {cols:flowCtr.cols,gap:flowCtr.gap,left:flowCtr.left,top:flowCtr.top,width:flowCtr.width,padx:flowCtr.padx,pady:flowCtr.pady};
  const el = map[key];
  el.addEventListener('input', ()=>{
    if (PAGES[cur]?.type!=='flow' || PAGES[cur]?.flow?.lock) return;  // abaikan jika dikunci
    const f=PAGES[cur].flow || {};
    if(key==='cols')  f.cols   = +flowCtr.cols.value;
    if(key==='gap')   f.gapPct = +flowCtr.gap.value;
    if(key==='left')  f.leftPct= +flowCtr.left.value;
    if(key==='top')   f.topPct = +flowCtr.top.value;
    if(key==='width') f.widthPct= +flowCtr.width.value;
    if(key==='padx')  f.padXPct= +flowCtr.padx.value;
    if(key==='pady')  f.padYPct= +flowCtr.pady.value;
    rerender();
  });
});

/* ---------- LocalStorage ---------- */
const KEY='seven_pages_editor_final_lockedbg_v4'; // bump versi

document.getElementById('save').onclick = ()=>{
  const data = PAGES.map(p => {
    const { boxes, flow, name, type } = p;
    return { name, type, boxes, flow }; // BG tidak ikut disimpan
  });
  localStorage.setItem(KEY, JSON.stringify(data));
  alert('Tersimpan di browser.');
};

(function restore(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw) return;
    const saved=JSON.parse(raw);
    if(Array.isArray(saved) && saved.length===PAGES.length){
      for(let i=0;i<PAGES.length;i++){
        const curPg = PAGES[i], savPg = saved[i] || {};
        if (savPg.flow && curPg.flow) curPg.flow = {...curPg.flow, ...savPg.flow};
        if (Array.isArray(savPg.boxes) && Array.isArray(curPg.boxes)){
          curPg.boxes = curPg.boxes.map((b, idx)=> ({...b, ...(savPg.boxes[idx]||{})}));
        }
      }
    }
  }catch(e){}
})();

/* ---------- Export (UPDATED) ---------- */
async function renderCanvasSafe() {
  try { await bgImg.decode(); } catch(e) {}
  stage.classList.add('exporting');
  await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
  try{
    const cv = await html2canvas(stage,{
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    });
    return cv;
  } finally {
    stage.classList.remove('exporting');
  }
}

document.getElementById('export').onclick = async ()=>{
  const cv = await renderCanvasSafe();
  cv.toBlob(b=>saveAs(b,`page-${cur+1}.png`));
};

document.getElementById('exportAll').onclick = async ()=>{
  const zip=new JSZip(); const keep=cur;
  const allowed = getAllowed();                 // hanya halaman yang diizinkan
  for(let li=0; li<allowed.length; li++){
    const i = allowed[li];                      // real index
    renderPage(i);
    const cv=await renderCanvasSafe();
    await new Promise(r=>cv.toBlob(b=>{
      const fr=new FileReader();
      fr.onload=()=>{ zip.file(`page-${li+1}.png`, fr.result.split(',')[1], {base64:true}); r(); };
      fr.readAsDataURL(b);
    }));
  }
  const blob=await zip.generateAsync({type:'blob'});
  saveAs(blob,'Selected-Pages.zip');
  renderPage(keep);
};

/* ---------- Navigasi & responsive ---------- */
function stepTo(delta){
  const allowed = getAllowed();
  const pos = Math.max(0, allowed.indexOf(cur)); // posisi logis sekarang
  const nextPos = (pos + delta + allowed.length) % allowed.length;
  renderPage(allowed[nextPos]); // kirim real index
}
btnPrev.onclick = ()=> stepTo(-1);
btnNext.onclick = ()=> stepTo(+1);
window.addEventListener('keydown', e=>{
  if(e.key==='ArrowLeft')  stepTo(-1);
  if(e.key==='ArrowRight') stepTo(+1);
});

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', ()=>{
  buildPager();
  renderPage(0);
});

/* =====================================================================
   Skills Builder — Halaman 1 (Self Potential)
   - Pilih model (bisa tambah model kustom)
   - Combine pilihan antar model (picked tidak di-reset saat ganti model)
   - Output: set label box Page 1 (+ halaman lanjutan bila >4)
   ===================================================================== */
(function(){
  /* ---------- Library Model → Skill list (default) ---------- */
  const SKILL_LIBRARY = {
    "WEF – Future Skills": [
      "Analytical & Critical Thinking","Creativity & Innovation","Leadership & Social Influence",
      "Technology Literacy & AI","Resilience & Agility","Emotional Intelligence & Empathy",
      "Curiosity & Lifelong Learning","Service Orientation","Talent Management","Motivation & Self-Awareness"
    ],
    "P21 – 21st Century Skills (4Cs)": [
      "Critical Thinking","Creativity","Collaboration","Communication","Information & Media Literacy","Initiative & Self-Direction"
    ],
    "EU – Key Competences": [
      "Literacy & Multilingual","Digital Competence","Personal & Social Learning","Civic Competence",
      "Entrepreneurship Competence","Cultural Awareness & Expression","STEM Competence"
    ],
    "Corporate – Katz": [
      "Strategic Thinking","Results Orientation","Stakeholder Influence","Team Leadership & Coaching",
      "Customer Focus","Change Management","Emotional Intelligence","Technical (Hard) Skills",
      "Human (Interpersonal) Skills","Conceptual (Big-Picture) Skills"
    ]
  };

  /* ---------- Persistensi Model Kustom ---------- */
  const SB_STORE = 'lgm_sb_custom_models_v1';
  function loadCustom(){
    try{ return JSON.parse(localStorage.getItem(SB_STORE)) || {}; }catch(_){ return {}; }
  }
  function saveCustom(obj){
    try{ localStorage.setItem(SB_STORE, JSON.stringify(obj)); }catch(_){}
  }
  // gabungkan model kustom (jika ada) ke library
  const CUSTOM_MODELS = loadCustom();
  Object.assign(SKILL_LIBRARY, CUSTOM_MODELS);

  /* ---------- State ---------- */
  // NOTE: picked disediakan oleh modul utama? kalau tidak ada, definisikan lokal:
  // let picked = [];
  // Namun di file kamu picked memang lokal ke Skills Builder. Kita definisikan di sini.
  let picked = []; // [{ title }]
  let skillsModel = Object.keys(SKILL_LIBRARY)[0]; // default model pertama

  /* ---------- Guard FRAME/withBase ---------- */
  try{
    if (typeof FRAME === 'object' && typeof withBase === 'function') {
      if (!FRAME['1_EXTRA']) FRAME['1_EXTRA'] = withBase('frame-02-extra.png');
    }
  }catch(_e){}

  /* ---------- Refs HTML ---------- */
  const skillsBuilder = document.getElementById('skillsBuilder');
  const modelSelect  = document.getElementById('modelSelect');
  const skillOptions = document.getElementById('skillOptions');

  /* ---------- CSS kecil ---------- */
  (function injectCSS(){
    if (document.getElementById('sb-inline-style')) return;
    const css = `
      #skillsBuilder .form-label{font-weight:700;margin-bottom:.25rem}
      #skillsBuilder .text-muted{opacity:.85}
      #skillsBuilder #modelSelect.form-select{
        border-radius:10px;border-color:var(--panel-border,#e9ecef);background:#fff;
        padding-top:.4rem;padding-bottom:.4rem
      }
      #skillsBuilder #modelSelect:focus{
        box-shadow:0 0 0 .25rem rgba(25,97,174,.15);border-color:rgba(25,97,174,.35);outline:0
      }
      #skillsBuilder #skillOptions{display:flex;flex-wrap:wrap;gap:.5rem}
      #skillsBuilder #skillOptions .pill{
        display:inline-block;padding:.38rem .66rem;border:1px solid var(--secondary,#E4E6EF);
        border-radius:999px;background:#fff;cursor:pointer;user-select:none;font-size:.86rem;line-height:1;
        transition:background .15s ease,color .15s ease,border-color .15s ease,transform .06s ease
      }
      #skillsBuilder #skillOptions .pill:hover{border-color:rgba(0,0,0,.12);transform:translateY(-1px)}
      #skillsBuilder #skillOptions .pill:active{transform:translateY(0)}
      #skillsBuilder #skillOptions .pill.active{
        background:var(--primary,#1961AE);color:#fff;border-color:var(--primary,#1961AE)
      }
      #skillsBuilder .mini-help{font-size:.85rem; opacity:.8}
      #skillsBuilder .badge-count{font-size:.75rem; margin-left:.4rem}
      #sb-custom .tag{display:inline-block; border:1px solid #dee2e6; border-radius:999px; padding:.15rem .5rem; margin:.2rem; background:#f8f9fa}
      #sb-custom .tag .x{margin-left:.35rem; cursor:pointer; opacity:.7}
      #sb-custom .tag .x:hover{opacity:1}
    `;
    const style = document.createElement('style');
    style.id = 'sb-inline-style';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /* ---------- UI: Panel Model Kustom (dibuat via JS, tidak perlu ubah HTML) ---------- */
  const customWrap = document.createElement('div');
  customWrap.id = 'sb-custom';
  customWrap.className = 'mt-2';
  customWrap.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <button id="sb_add_model" type="button" class="btn btn-sm btn-outline-primary">+ Model Kustom</button>
      <span id="sb_selected_count" class="badge bg-secondary badge-count">0/8 terpilih</span>
    </div>
    <div id="sb_custom_form" class="mt-2 d-none">
      <div class="mini-help mb-1">Beri nama model & tambahkan skill satu-per-satu (Enter).</div>
      <input id="sb_custom_name" class="form-control form-control-sm mb-2" placeholder="Nama model (mis. Prodi/Organisasi Anda)" />
      <div class="input-group input-group-sm mb-2">
        <input id="sb_custom_skill" class="form-control" placeholder="Tambah skill, lalu tekan Enter" />
        <button id="sb_custom_add" class="btn btn-outline-secondary" type="button">Tambah</button>
      </div>
      <div id="sb_custom_list" class="mb-2"></div>
      <div class="d-flex gap-2">
        <button id="sb_custom_save" class="btn btn-sm btn-primary" type="button">Simpan Model</button>
        <button id="sb_custom_cancel" class="btn btn-sm btn-outline-secondary" type="button">Batal</button>
      </div>
    </div>
  `;
  skillsBuilder?.appendChild(customWrap);

  /* ---------- Helpers Panel Kustom ---------- */
  let draftSkills = []; // array of strings

  function renderModelSelect(){
    if (!modelSelect) return;
    const names = Object.keys(SKILL_LIBRARY);
    modelSelect.innerHTML = names.map(m => `<option value="${m}">${m}</option>`).join('');
    // jika selected hilang (mis. setelah tambah model), set ke yang ada
    if (!names.includes(skillsModel)) skillsModel = names[0];
    modelSelect.value = skillsModel;
  }

  function renderSelectedCount(){
    const el = document.getElementById('sb_selected_count');
    if (el) el.textContent = `${picked.length}/8 terpilih`;
  }

  function renderPills(){
    if (!skillOptions) return;
    const all = SKILL_LIBRARY[skillsModel] || [];
    const sel = new Set(picked.map(p=>p.title));
    skillOptions.innerHTML = all.map(name => {
      const active = sel.has(name) ? 'active' : '';
      return `<button type="button" class="pill ${active}" data-skill="${encodeURIComponent(name)}">${name}</button>`;
    }).join('');
  }

  function renderDraftTags(){
    const host = document.getElementById('sb_custom_list');
    if (!host) return;
    if (!draftSkills.length){
      host.innerHTML = `<span class="mini-help">Belum ada skill. Tambahkan di input di atas lalu Enter.</span>`;
      return;
    }
    host.innerHTML = draftSkills.map((s,ix)=>(
      `<span class="tag">${escapeHtml(s)} <span data-ix="${ix}" class="x">×</span></span>`
    )).join('');
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function addDraftSkill(val){
    const v = String(val||'').trim();
    if (!v) return;
    const next = Array.from(new Set([...draftSkills, v]));
    draftSkills = next.slice(0, 100); // guard
    renderDraftTags();
  }

  function clearDraft(){
    draftSkills = [];
    const name = document.getElementById('sb_custom_name');
    const skill = document.getElementById('sb_custom_skill');
    if (name) name.value = '';
    if (skill) skill.value = '';
    renderDraftTags();
  }

  function toggleCustomForm(show){
    const form = document.getElementById('sb_custom_form');
    if (!form) return;
    form.classList.toggle('d-none', !show);
  }

  /* ============================ SINKRONISASI → PAGES ============================ */
  function syncToPages(){
    try{
      const page1 = (typeof PAGES!=='undefined') ? PAGES[0] : null;
      if(!page1 || page1.type!=='flow') return;

      // style judul & body konsisten
      page1.boxes.forEach(b=>{
        b.style = b.style || {};
        if(!b.style.titleColor) b.style.titleColor = "#f6e6c5";
        if(!b.style.bodyBg && typeof COLOR!=='undefined') b.style.bodyBg = COLOR.bodySelf;
      });

      // 4 pertama → page 1 (judul dari picked; konten diketik user di form utama)
      const first4 = picked.slice(0,4);
      for(let i=0;i<4;i++){
        const b = page1.boxes[i];
        const src = first4[i];
        if(!b) continue;
        b.label = src ? src.title : `Skill ${i+1}`;
      }

      // Sisa → halaman lanjutan (judul saja)
      const rest = picked.slice(4);
      ensureSkillContinuationPage(rest.length>0, {...page1.flow});
      if(rest.length>0){
        const pCont = PAGES[1];
        pCont.bg = (FRAME && (FRAME['1_EXTRA'] || FRAME[1])) || (page1.bg || null);
        pCont.boxes = rest.slice(0,4).map((s,idx)=>({
          id: 'p1c'+idx,
          label: s.title,
          fs: 20, lh: 1.35,
          val: '',
          style:{ bodyBg: (typeof COLOR!=='undefined' ? COLOR.bodySelf : undefined), titleColor: "#f6e6c5" }
        }));
      }

      if (typeof renderPage === 'function' && typeof cur!=='undefined') renderPage(cur);
    }catch(_e){}
  }

  function ensureSkillContinuationPage(needed, flowSample){
    try{
      const exists = typeof PAGES!=='undefined' && PAGES[1] && PAGES[1].__isSkillCont;
      if(needed && !exists){
        PAGES.splice(1,0,{
          __isSkillCont:true,
          name:"Self Potential — Continued",
          type:'flow',
          bg: (FRAME && (FRAME['1_EXTRA'] || FRAME[1])) || null,
          flow:{ ...flowSample, lock:true },
          boxes:[]
        });
        if (typeof buildPager === 'function') buildPager();
      } else if(!needed && exists){
        PAGES.splice(1,1);
        if (typeof buildPager === 'function') buildPager();
        if (typeof cur!=='undefined' && cur===1) cur=0;
      }
    }catch(_e){}
  }

  /* ================================ EVENTS & INIT ================================ */
  function boot(){
    if (!skillsBuilder) return;

    renderModelSelect();
    renderPills();
    renderSelectedCount();
    syncToPages();

    // Ganti model → TIDAK reset picked (biar bisa combine antar model)
    modelSelect?.addEventListener('change', ()=>{
      skillsModel = modelSelect.value;
      renderPills();
      // picked tetap; cukup sync judul
      syncToPages();
    });

    // Toggle pill (maks 8, combine antar model)
    skillOptions?.addEventListener('click', (e)=>{
      const btn = e.target.closest('.pill'); if(!btn) return;
      const name = decodeURIComponent(btn.dataset.skill||'');
      const ix = picked.findIndex(p=>p.title===name);
      if(ix>=0){
        picked.splice(ix,1);
      }else{
        if(picked.length>=8){ alert('Max 8 skills.'); return; }
        picked.push({title:name});
      }
      renderPills();
      renderSelectedCount();
      syncToPages();
    });

    // Panel Model Kustom
    document.getElementById('sb_add_model')?.addEventListener('click', ()=> toggleCustomForm(true));
    document.getElementById('sb_custom_cancel')?.addEventListener('click', ()=>{
      toggleCustomForm(false);
      clearDraft();
    });

    // Tambah skill kustom
    document.getElementById('sb_custom_add')?.addEventListener('click', ()=>{
      const inp = document.getElementById('sb_custom_skill');
      if (!inp) return;
      addDraftSkill(inp.value);
      inp.value = '';
      inp.focus();
    });
    document.getElementById('sb_custom_skill')?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter'){
        e.preventDefault();
        const inp = e.currentTarget;
        addDraftSkill(inp.value);
        inp.value = '';
      }
    });
    document.getElementById('sb_custom_list')?.addEventListener('click', (e)=>{
      const x = e.target.closest('.x');
      if (!x) return;
      const ix = +x.dataset.ix;
      if (ix>=0){
        draftSkills.splice(ix,1);
        renderDraftTags();
      }
    });

    // Simpan model kustom
    document.getElementById('sb_custom_save')?.addEventListener('click', ()=>{
      const nameEl = document.getElementById('sb_custom_name');
      const name = String(nameEl?.value||'').trim();
      const skills = Array.from(new Set(draftSkills.map(s=>String(s).trim()).filter(Boolean)));

      if (!name){ alert('Nama model tidak boleh kosong.'); return; }
      if (!skills.length){ alert('Tambahkan minimal 1 skill.'); return; }

      // simpan ke storage
      const nextCustom = loadCustom();
      nextCustom[name] = skills;
      saveCustom(nextCustom);

      // masukkan ke library & refresh select
      SKILL_LIBRARY[name] = skills;
      skillsModel = name;
      renderModelSelect();
      renderPills();

      // tutup form
      toggleCustomForm(false);
      clearDraft();
    });

    // render list awal panel kustom
    renderDraftTags();
  }

  // Mulai
  boot();
})();


window.addEventListener('message', (e)=>{
  const msg = e.data || {};
  if (msg.type === 'lgm:apply-degree') {
    const level = String(msg?.payload?.level || "").toLowerCase();

    if (level === 'magister') {
      // hide semua halaman yang namanya mengandung "(5–8)" = Study Plan S3
      ALLOWED_INDEXES = PAGES
        .map((p, i) => (/\(5–8\)|\(5-8\)/.test(String(p?.name||"")) ? null : i))
        .filter(i => i !== null);
    } else {
      // dokter atau unknown -> tampilkan semua
      ALLOWED_INDEXES = null;
    }

    // rebuild pager & tampilkan halaman terdekat yang masih ada
    const allowed = (Array.isArray(ALLOWED_INDEXES) && ALLOWED_INDEXES.length)
      ? ALLOWED_INDEXES : PAGES.map((_,i)=>i);

    let next = cur;
    if (!allowed.includes(cur)) next = allowed[0] ?? 0;

    buildPager();
    renderPage(next);
  } else if (msg.type === 'parent:focus') {
    window.scrollTo({top:0, behavior:'smooth'});
  }
});
/* ===== Helpers: set nilai box & sinkron UI ===== */
function setBoxVal(boxId, text){
  // 1) update object PAGES
  let target=null;
  for(const pg of PAGES){
    if (!Array.isArray(pg.boxes)) continue;
    const f = pg.boxes.find(b => b.id === boxId);
    if (f){ target=f; break; }
  }
  if (!target) return;
  target.val = text || "";

  // 2) preview (kanan)
  const out = document.getElementById("out_"+boxId);
  if (out) out.textContent = target.val;

  // 3) textarea (kiri)
  const ta = document.getElementById("in_"+boxId);
  if (ta){
    ta.value = target.val;
    ta.dispatchEvent(new Event('input',{bubbles:true}));
  }
}

/* ===== Template isi Term (boleh kamu ubah) ===== */
function buildTermText({ title, date, note }){
  const parts = [];
  if (date) parts.push(`${title}: ${date}`);
  if (note) parts.push(note);
  return parts.join("\n");
}

/* ===== Ambil "Mulai/Selesai" dari record CSV & isi ke Term =====
   - S2/Magister:   Term-1 = Mulai (p2a),  Term-4 = Selesai (p2d)
   - S3/Doktoral:   Term-1 = Mulai (p2a),  Term-8 = Selesai (p3d)
*/
function applyRecordToPages(rec, degreeRaw){
  if (!rec) return;

  // Sesuaikan nama kolom ini dgn CSV kamu
  const mulai   = String(rec["Mulai Studi"]   || rec["Mulai"]   || rec["Start"] || "").trim();
  const selesai = String(rec["Selesai Studi"] || rec["Selesai"] || rec["End"]   || "").trim();

  const d = String(degreeRaw||"").toLowerCase();
  const isMagister = /(s2|magister|master)/.test(d);
  const isDoktor   = /(s3|doktor|doctor|doctoral)/.test(d);

  // Tulis ke Term-1
  if (mulai){
    setBoxVal("p2a", buildTermText({
      title:"Mulai Studi",
      date: mulai,
      note:"Adaptasi akademik, rencana awal riset, & administrasi."
    }));
  }

  // Tulis ke Term-4 (S2) atau Term-8 (S3)
  if (selesai){
    if (isMagister){
      setBoxVal("p2d", buildTermText({
        title:"Selesai Studi",
        date: selesai,
        note:"Submit tesis, publikasi akhir, & kelulusan."
      }));
    } else if (isDoktor){
      setBoxVal("p3d", buildTermText({
        title:"Selesai Studi",
        date: selesai,
        note:"Sidang akhir, publikasi kumulatif, & rencana pasca-doktoral."
      }));
    } else {
      // fallback kalau degree belum terdeteksi
      setBoxVal("p2d", buildTermText({ title:"Selesai Studi", date: selesai }));
    }
  }
}

/* ===== Terima data dari Twibbon (iframe) =====
   Twibbon kirim: { type:'twibbon:selected', degree, record } :contentReference[oaicite:1]{index=1}
*/
window.addEventListener("message", (ev)=>{
  const msg = ev.data || {};
  if (msg.type === "twibbon:selected"){
    applyRecordToPages(msg.record, msg.degree);
    // opsional: pindahkan ke halaman Study Plan (1–4) biar langsung terlihat
    // renderPage(1); // real index untuk "Study Plan (1–4)" bila urutan PAGES-mu sama
  }
});
