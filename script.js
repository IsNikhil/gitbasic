(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Scroll progress bar ---------- */
  var bar = document.getElementById('progress-bar');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
      updateBranch();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- Reveal on scroll ---------- */
  var revealTargets = document.querySelectorAll('.reveal, #file-stack, #timeline, #flow-list');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Active nav link ---------- */
  var navLinks = document.querySelectorAll('.nav-links a');
  var linkFor = {};
  navLinks.forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });

  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
        var link = linkFor[entry.target.id];
        if (link) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'true');
          // Keep the active link visible in the scrollable nav on phones
          var list = link.parentElement.parentElement;
          var left = link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2;
          list.scrollTo({ left: left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- Branch scrollytelling ---------- */
  var scrolly = document.getElementById('branch');
  var figure = document.getElementById('branch-figure');
  var stepItems = scrolly.querySelectorAll('.branch-steps li');
  var stepDots = scrolly.querySelectorAll('.step-dots span');
  var hint = scrolly.querySelector('.scroll-hint');
  var STEPS = 5;
  var currentStep = -1;

  function updateBranch() {
    var rect = scrolly.getBoundingClientRect();
    var travel = scrolly.offsetHeight - window.innerHeight;
    var p = travel > 0 ? -rect.top / travel : 1;
    p = Math.min(0.999, Math.max(0, p));
    var step = Math.floor(p * STEPS);
    if (step === currentStep) return;
    currentStep = step;
    figure.setAttribute('data-step', step);
    stepItems.forEach(function (li, i) { li.classList.toggle('on', i === step); });
    stepDots.forEach(function (d, i) { d.classList.toggle('on', i <= step); });
    hint.classList.toggle('gone', step === STEPS - 1);
  }
  updateBranch();
  onScroll();

  /* ---------- Merge demo ---------- */
  var mergeBtn = document.getElementById('merge-btn');
  var mergeDone = document.getElementById('merge-done');
  var mergeStage = 0;

  mergeBtn.addEventListener('click', function () {
    if (mergeStage === 0) {
      mergeStage = 1;
      mergeBtn.textContent = 'Confirm merge';
      mergeDone.textContent = 'Are you sure? Click Confirm merge.';
    } else if (mergeStage === 1) {
      mergeStage = 2;
      mergeBtn.textContent = 'Merged';
      mergeBtn.classList.add('merged');
      mergeBtn.setAttribute('aria-disabled', 'true');
      mergeDone.textContent = 'Pull request merged. Your changes are now in main.';
    } else {
      mergeStage = 0;
      mergeBtn.textContent = 'Merge pull request';
      mergeBtn.classList.remove('merged');
      mergeBtn.removeAttribute('aria-disabled');
      mergeDone.textContent = '';
    }
  });

  /* ---------- Merge conflict demo ---------- */
  var conflict = document.getElementById('conflict');
  var conflictResult = document.getElementById('conflict-result');
  var anaLine = conflict.querySelector('.ana');
  var benLine = conflict.querySelector('.ben');
  var chips = conflict.querySelectorAll('.chip');
  var conflictText = {
    ana: 'Done. Line 1 now says "Welcome to my page". The conflict is fixed.',
    ben: 'Done. Line 1 now says "Hello and welcome". The conflict is fixed.',
    both: 'Done. You kept both lines. The conflict is fixed.'
  };

  chips.forEach(function (chip) {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', function () {
      var keep = chip.getAttribute('data-keep');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      anaLine.classList.toggle('dropped', keep === 'ben');
      benLine.classList.toggle('dropped', keep === 'ana');
      conflictResult.textContent = conflictText[keep];
    });
  });

  /* ---------- Fake terminal ---------- */
  var commands = [
    {
      cmd: 'git clone https://github.com/you/hello-world.git',
      out: "Cloning into 'hello-world'...\nReceiving objects: 100% (3/3), done.",
      title: 'git clone',
      text: 'Copies a project from GitHub onto your computer, with its full history. You usually do this once per project.'
    },
    {
      cmd: 'git status',
      out: "On branch main\nChanges not staged for commit:\n  modified:   README.md",
      title: 'git status',
      text: 'Shows what you changed since your last commit. Use it any time you feel lost. It never changes anything.'
    },
    {
      cmd: 'git add .',
      out: '(No message. That means it worked.)',
      title: 'git add .',
      text: 'Picks your changed files to go into the next commit. The dot means "everything in this folder". Think of it as putting things in the box before you seal it.'
    },
    {
      cmd: 'git commit -m "Fix typo in title"',
      out: "[main 3f2a1b9] Fix typo in title\n 1 file changed, 1 insertion(+), 1 deletion(-)",
      title: 'git commit -m "note"',
      text: 'Takes the snapshot. This is your save point. The text in quotes is your note about what changed.'
    },
    {
      cmd: 'git push',
      out: "To github.com/you/hello-world.git\n   a1b2c3d..3f2a1b9  main -> main",
      title: 'git push',
      text: 'Sends your new commits from your computer up to GitHub, so they are backed up and others can see them.'
    },
    {
      cmd: 'git pull',
      out: "Updating 3f2a1b9..8c4d2e7\nFast-forward\n README.md | 2 +-",
      title: 'git pull',
      text: 'Brings the newest changes from GitHub down to your computer. Do this before you start working.'
    }
  ];

  var cmdButtons = document.querySelectorAll('.cmd');
  var termCmd = document.getElementById('term-cmd');
  var termOut = document.getElementById('term-out');
  var explainTitle = document.getElementById('explain-title');
  var explainText = document.getElementById('explain-text');
  var typingTimer = null;

  function runCommand(index) {
    var c = commands[index];
    clearTimeout(typingTimer);
    cmdButtons.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === index)); });
    explainTitle.textContent = c.title;
    explainText.textContent = c.text;
    termOut.textContent = '';

    if (reduceMotion.matches) {
      termCmd.textContent = c.cmd;
      termOut.textContent = c.out;
      return;
    }

    var i = 0;
    termCmd.textContent = '';
    (function type() {
      i++;
      termCmd.textContent = c.cmd.slice(0, i);
      if (i < c.cmd.length) {
        typingTimer = setTimeout(type, 28 + Math.random() * 30);
      } else {
        typingTimer = setTimeout(function () { termOut.textContent = c.out; }, 350);
      }
    })();
  }

  cmdButtons.forEach(function (b) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { runCommand(Number(b.getAttribute('data-cmd'))); });
  });

  /* ---------- Hello World checklist ---------- */
  var STORE_KEY = 'gitfromzero-hello-world';
  var boxes = document.querySelectorAll('#hw-list input[type="checkbox"]');
  var hwBar = document.getElementById('hw-bar');
  var hwCount = document.getElementById('hw-count');
  var hwDone = document.getElementById('hw-done');

  function loadTicks() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveTicks(ticks) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(ticks));
    } catch (e) { /* storage blocked: ticks just won't persist */ }
  }

  function renderTicks() {
    var done = 0;
    boxes.forEach(function (box) {
      box.closest('.hw-step').classList.toggle('done', box.checked);
      if (box.checked) done++;
    });
    hwBar.style.width = (done / boxes.length * 100) + '%';
    hwCount.textContent = done + ' of ' + boxes.length + ' done';
    hwDone.textContent = done === boxes.length
      ? 'You did it! You just used the full GitHub flow. 🎉'
      : '';
  }

  var ticks = loadTicks();
  boxes.forEach(function (box) {
    var key = box.getAttribute('data-step');
    box.checked = !!ticks[key];
    box.addEventListener('change', function () {
      ticks[key] = box.checked;
      saveTicks(ticks);
      renderTicks();
    });
  });
  renderTicks();

  /* ---------- Quiz ---------- */
  var questions = [
    {
      q: 'What is a commit?',
      options: ['A new website', 'A save point with a short note', 'A way to delete files'],
      answer: 1,
      why: 'A commit is a snapshot of your files, plus a note about what you changed.'
    },
    {
      q: 'Why use a branch?',
      options: ['To try ideas without breaking main', 'To make your files smaller', 'To share your password'],
      answer: 0,
      why: 'A branch is a safe copy. Main stays untouched until you merge.'
    },
    {
      q: 'What is the difference between Git and GitHub?',
      options: ['They are the same thing', 'Git is a website, GitHub is an app', 'Git is a tool on your computer, GitHub is a website that keeps projects online'],
      answer: 2,
      why: 'Git is the camera. GitHub is the online photo album.'
    },
    {
      q: 'In a pull request, what do green lines mean?',
      options: ['Lines that were added', 'Lines that were removed', 'Lines with errors'],
      answer: 0,
      why: 'Green means added. Red means removed.'
    },
    {
      q: 'Two people changed the same line. What happens?',
      options: ['GitHub deletes the project', 'A merge conflict: you pick what to keep', 'Git picks one at random'],
      answer: 1,
      why: 'A merge conflict is not an error. It is just Git asking you a question.'
    }
  ];

  var quizList = document.getElementById('quiz-list');
  var quizScore = document.getElementById('quiz-score');
  var answered = 0;
  var correct = 0;

  function buildQuiz() {
    quizList.innerHTML = '';
    quizScore.innerHTML = '';
    answered = 0;
    correct = 0;

    questions.forEach(function (item, qi) {
      var fs = document.createElement('fieldset');
      fs.className = 'q reveal in';

      var legend = document.createElement('legend');
      var num = document.createElement('span');
      num.textContent = (qi + 1) + '.';
      legend.appendChild(num);
      legend.appendChild(document.createTextNode(item.q));
      fs.appendChild(legend);

      var opts = document.createElement('div');
      opts.className = 'q-options';
      var feedback = document.createElement('p');
      feedback.className = 'q-feedback';
      feedback.setAttribute('aria-live', 'polite');

      item.options.forEach(function (text, oi) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'q-opt';
        btn.textContent = text;
        btn.addEventListener('click', function () {
          var buttons = opts.querySelectorAll('button');
          buttons.forEach(function (b) { b.disabled = true; });
          buttons[item.answer].classList.add('correct');
          var right = oi === item.answer;
          if (!right) btn.classList.add('wrong');
          feedback.innerHTML = '';
          var lead = document.createElement('strong');
          lead.textContent = right ? 'Correct! ' : 'Not quite. ';
          feedback.appendChild(lead);
          feedback.appendChild(document.createTextNode(item.why));
          answered++;
          if (right) correct++;
          if (answered === questions.length) showScore();
        });
        opts.appendChild(btn);
      });

      fs.appendChild(opts);
      fs.appendChild(feedback);
      quizList.appendChild(fs);
    });
  }

  function showScore() {
    var msg = correct === questions.length
      ? 'You got all ' + correct + ' right. Amazing!'
      : 'You got ' + correct + ' of ' + questions.length + ' right. Nice work!';
    quizScore.textContent = msg;
    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'quiz-reset';
    again.textContent = 'Try again';
    again.addEventListener('click', function () {
      buildQuiz();
      quizList.querySelector('.q-opt').focus();
    });
    quizScore.appendChild(again);
  }

  buildQuiz();

  /* ---------- Glossary search ---------- */
  var search = document.getElementById('gloss-search');
  var entries = document.querySelectorAll('#glossary-list > div');
  var empty = document.getElementById('gloss-empty');
  var originals = [];
  entries.forEach(function (el) {
    originals.push({ dt: el.querySelector('dt').textContent, dd: el.querySelector('dd').textContent });
  });

  function highlight(node, text, term) {
    node.textContent = '';
    if (!term) { node.textContent = text; return; }
    var lower = text.toLowerCase();
    var pos = 0;
    var idx;
    while ((idx = lower.indexOf(term, pos)) !== -1) {
      node.appendChild(document.createTextNode(text.slice(pos, idx)));
      var mark = document.createElement('mark');
      mark.textContent = text.slice(idx, idx + term.length);
      node.appendChild(mark);
      pos = idx + term.length;
    }
    node.appendChild(document.createTextNode(text.slice(pos)));
  }

  search.addEventListener('input', function () {
    var term = search.value.trim().toLowerCase();
    var shown = 0;
    entries.forEach(function (el, i) {
      var o = originals[i];
      var match = !term || (o.dt + ' ' + o.dd).toLowerCase().indexOf(term) !== -1;
      el.hidden = !match;
      if (match) shown++;
      highlight(el.querySelector('dt'), o.dt, term);
      highlight(el.querySelector('dd'), o.dd, term);
    });
    empty.hidden = shown !== 0;
  });
})();
