export const meta = {
  name: 'lp-task-loop',
  description: 'lp-task-loop: implement, verify, skeptic, review and fix until no blocking findings or the iteration limit',
  whenToUse: 'Started by /lp-task-loop:run after its setup step, with args from it. Not for direct use.',
  phases: [
    { title: 'Implement', detail: 'implementer edits the working copy' },
    { title: 'Verify', detail: 'snapshot, lint, typecheck, related tests' },
    { title: 'Skeptic', detail: 'does the change do the task (criteria, evidence)' },
    { title: 'Review', detail: 'code quality of the diff, only after the skeptic passes' },
  ],
}

// args (from skills/run/SKILL.md step 0):
// { repo, workDir, task, criteria: [string], commands: {lint, typecheck, test, build}, evidence, base, max, budget }
// After a checkpoint the skill resumes this run with the same args plus
// { confirmed: true, spentBefore: <tokens of the first run>, resumeAt: <its last iteration> }.
const A = args || {}
const MAX = Math.max(1, Number(A.max) || 3)
// Output tokens of the whole loop. budget.spent() is per turn, cached agents of a resumed run cost nothing.
const BUDGET = Math.max(1, Number(A.budget) || 150000)
const START = budget.spent()
const used = () => (Number(A.spentBefore) || 0) + budget.spent() - START
const k = (t) => `${Math.round(t / 1000)}k`
// Iterations up to resumeAt were already checked on the first run, their guards are skipped on replay.
const live = (n) => n > (Number(A.resumeAt) || 0)
const CRITERIA = A.criteria || []
const commands = Object.entries(A.commands || {})
  .filter(([, v]) => v)
  .map(([k, v]) => `- ${k}: \`${v}\``)
  .join('\n') || '- none found'
const evidence = A.evidence ? `\n\nEvidence (real data observed when the bug was reproduced):\n${A.evidence}` : ''
const criteriaList = (list) => list.map((c, i) => `${i + 1}. ${c}`).join('\n')

const IMPL = {
  type: 'object',
  properties: {
    changed: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, what: { type: 'string' } }, required: ['path', 'what'] } },
    notDone: { type: 'array', items: { type: 'string' } },
    disputed: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, argument: { type: 'string' } }, required: ['finding', 'argument'] } },
    blocker: { type: 'string', description: 'something only the user can resolve; empty if none' },
  },
  required: ['changed', 'notDone', 'disputed', 'blocker'],
}
const VER = {
  type: 'object',
  properties: {
    snapshot: { type: 'string', description: 'tree hash printed by the snapshot command' },
    shortstat: { type: 'string', description: 'output of git diff --shortstat <base> <snapshot>' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'fail', 'skipped'] },
          preExisting: { type: 'boolean' },
          error: { type: 'string', description: 'file:line and the first meaningful error line, or why skipped' },
        },
        required: ['command', 'status', 'preExisting', 'error'],
      },
    },
  },
  required: ['snapshot', 'shortstat', 'results'],
}
const FINDING = {
  type: 'object',
  properties: {
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    file: { type: 'string', description: 'file:line' },
    problem: { type: 'string' },
    evidence: { type: 'string' },
  },
  required: ['severity', 'file', 'problem', 'evidence'],
}
const SKEPTIC = {
  type: 'object',
  properties: {
    criteria: {
      type: 'array',
      items: { type: 'object', properties: { criterion: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, evidence: { type: 'string' } }, required: ['criterion', 'verdict', 'evidence'] },
    },
    outside: { type: 'array', items: FINDING },
    disputes: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, accepted: { type: 'boolean' }, why: { type: 'string' } }, required: ['finding', 'accepted', 'why'] } },
  },
  required: ['criteria', 'outside', 'disputes'],
}
const REVIEW = {
  type: 'object',
  properties: {
    previous: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, fixed: { type: 'boolean' } }, required: ['finding', 'fixed'] } },
    findings: { type: 'array', items: FINDING },
  },
  required: ['previous', 'findings'],
}

const fmt = (f) => `${f.severity} | ${f.file} | ${f.problem} | ${f.evidence}`
const brief = (f) => `${f.file} | ${f.problem}`
// A second reviewer with its own lens runs only on the first review of a large diff.
const BIG_LINES = 300
const BIG_FILES = 8
const isBig = (stat) => {
  const num = (re) => Number((String(stat || '').match(re) || [0, 0])[1])
  return num(/(\d+) files? changed/) > BIG_FILES || num(/(\d+) insertions?/) + num(/(\d+) deletions?/) > BIG_LINES
}
const fileOf = (f) => String(f.file || '').split(':')[0]
const fromSkeptic = (sk) => [
  ...(sk.criteria || []).filter((c) => c.verdict === 'FAIL')
    .map((c) => ({ severity: 'high', file: (String(c.evidence).match(/[\w./-]+:\d+/) || ['?'])[0], problem: `criterion fails: ${c.criterion}`, evidence: c.evidence, source: 'skeptic' })),
  ...(sk.outside || []).map((f) => ({ ...f, source: 'skeptic' })),
]

const snapshotCmd = `cp "$(git -C "${A.repo}" rev-parse --path-format=absolute --git-path index)" "${A.workDir}/idx" 2>/dev/null; GIT_INDEX_FILE="${A.workDir}/idx" git -C "${A.repo}" add -A && GIT_INDEX_FILE="${A.workDir}/idx" git -C "${A.repo}" write-tree`

let prevSnap = A.base
let prevBlocking = []
let disputes = []
let skepticCriteria = CRITERIA
let lastSkeptic = null
let lastVerifier = null
let nonBlocking = []
let reported = []
let reviewed = false
let notDone = []
let status = 'лимит итераций'
let iterations = 0
let blocker = ''
let checkpointReason = ''
let prevFails = null
const critState = {}
const failCount = (sk) => (sk.criteria || []).filter((c) => c.verdict === 'FAIL').length
const remember = (sk) => (sk.criteria || []).forEach((c) => { critState[c.criterion] = c.verdict })
const overBudget = (n) => live(n) && used() >= BUDGET

for (let n = 1; n <= MAX; n++) {
  // Hard limit: do not start an iteration that would not fit by the average cost of the previous ones.
  if (n > 1 && live(n) && used() + used() / (n - 1) > BUDGET) { status = 'лимит токенов'; break }
  if (overBudget(n)) { status = 'лимит токенов'; break }
  iterations = n
  let skRan = false

  // 1. Implement: a fresh implementer every iteration, given the current state and the findings.
  const implPrompt = n === 1
    ? `Repo root: ${A.repo}\n\nTask:\n${A.task}\n\nAcceptance criteria:\n${criteriaList(CRITERIA)}\n\nProject commands:\n${commands}${evidence}\n\nImplement the task.`
    : `Repo root: ${A.repo}\n\nTask:\n${A.task}\n\nAcceptance criteria:\n${criteriaList(CRITERIA)}\n\nProject commands:\n${commands}${evidence}\n\nThe working copy already has the changes of the previous iterations (\`git -C "${A.repo}" status\`, \`git -C "${A.repo}" diff\`). Fix these blocking findings:\n${prevBlocking.map(fmt).join('\n')}` +
      (disputes.length ? `\n\nThe skeptic's answers to your previous disputes:\n${disputes.map((d) => `${d.finding} → ${d.accepted ? 'accepted' : 'rejected'}: ${d.why}`).join('\n')}` : '')
  const impl = await agent(implPrompt, { agentType: 'lp-task-loop:implementer', schema: IMPL, label: `implement #${n}`, phase: 'Implement' })
  if (!impl) { status = 'ошибка агента'; break }
  notDone = impl.notDone || []
  if (impl.blocker) { blocker = impl.blocker; status = 'блокер'; break }

  // 2. Verify: snapshot first, then the cheap checks.
  const ver = await agent(
    `Repo root: ${A.repo}\n\nFirst take the snapshot of the working copy with exactly this command (it uses a temporary index, the real index and files are not touched) and return the printed hash as \`snapshot\`:\n\n${snapshotCmd}\n\nReturn the output of \`git -C "${A.repo}" diff --shortstat ${A.base} <snapshot>\` as \`shortstat\`. Then run the checks. Project commands:\n${commands}\n\nChanged files: \`git -C "${A.repo}" diff --name-only ${A.base} <snapshot>\`. Range to tell new failures from pre-existing ones: ${A.base} <snapshot>.`,
    { agentType: 'lp-task-loop:verifier', schema: VER, label: `verify #${n}`, phase: 'Verify', effort: 'low' },
  )
  if (!ver || !ver.snapshot) { status = 'ошибка агента'; break }
  lastVerifier = ver
  const snap = ver.snapshot.trim()
  const noChanges = snap === prevSnap && !(impl.disputed || []).length

  let blocking = (ver.results || [])
    .filter((r) => r.status === 'fail' && !r.preExisting)
    .map((r) => ({ severity: 'high', file: r.error.split(' ')[0] || r.command, problem: `${r.command} fails`, evidence: r.error, source: 'verifier' }))

  if (!blocking.length && overBudget(n)) { status = 'лимит токенов'; prevSnap = snap; prevBlocking = blocking; break }

  if (!blocking.length) {
    // 3a. Skeptic: does the change do the task?
    const full = skepticCriteria.length === CRITERIA.length
    const sk = await agent(
      `Repo root: ${A.repo}\n\nTask:\n${A.task}\n\nCriteria to check:\n${criteriaList(skepticCriteria)}\n\nDiff range: ${A.base} ${snap} (\`git -C "${A.repo}" diff ${A.base} ${snap}\`).\n\nImplementer report:\nChanged: ${(impl.changed || []).map((c) => `${c.path} (${c.what})`).join('; ') || 'nothing'}\nNot done: ${notDone.join('; ') || 'nothing'}${evidence}` +
        ((impl.disputed || []).length ? `\n\nImplementer disputes, decide for each:\n${impl.disputed.map((d) => `${d.finding} → ${d.argument}`).join('\n')}` : ''),
      { agentType: 'lp-task-loop:skeptic', schema: SKEPTIC, label: `skeptic #${n}`, phase: 'Skeptic' },
    )
    if (!sk) { status = 'ошибка агента'; break }
    lastSkeptic = sk
    skRan = true
    remember(sk)
    disputes = sk.disputes || []
    blocking = fromSkeptic(sk)

    if (!blocking.length && overBudget(n)) { status = 'лимит токенов'; prevSnap = snap; prevBlocking = []; break }

    // 3b. Reviewer: code quality, only when the skeptic found nothing.
    // First review: the whole diff. Later ones: the full diff of the files the fix touched, the fix itself as the focus.
    if (!blocking.length) {
      const accepted = disputes.filter((d) => d.accepted).map((d) => d.finding)
      const range = !reviewed
        ? `Diff range to review: ${A.base} ${snap} (\`git -C "${A.repo}" diff ${A.base} ${snap}\`).`
        : `Diff range to review: ${A.base} ${snap}, only the files the last fix touched (\`git -C "${A.repo}" diff ${A.base} ${snap} -- $(git -C "${A.repo}" diff --name-only ${prevSnap} ${snap})\`). Focus on the last fix (\`git -C "${A.repo}" diff ${prevSnap} ${snap}\`) and on how it interacts with the rest of these files; do not re-read the other changed files.`
      // Previous blocking findings stay out of «already reported»: an unfixed one must be reported again to keep blocking.
      const known = reported.filter((r) => !prevBlocking.some((b) => r === brief(b)))
      const common = `Repo root: ${A.repo}\n\nTask:\n${A.task}\n\n${range}` +
        (known.length ? `\n\nAlready reported, do not report again and do not change their severity:\n${known.join('\n')}` : '') +
        (accepted.length ? `\n\nDo not report these again, the skeptic accepted the implementer's argument:\n${accepted.join('\n')}` : '')
      const previous = prevBlocking.length ? `\n\nPrevious blocking findings, say for each whether it is fixed; report one that is not fixed again as a finding:\n${prevBlocking.map(fmt).join('\n')}` : ''
      const split = !reviewed && isBig(ver.shortstat)
      const rvs = split
        ? await parallel([
          () => agent(common + previous + '\n\nLens: correctness, edge cases, callers of the changed code.', { agentType: 'lp-task-loop:reviewer', schema: REVIEW, label: `review #${n} correctness`, phase: 'Review' }),
          () => agent(common + '\n\nLens: security, error handling, concurrency and async. Do not invoke the lp-code-review skill, use your own checklist.', { agentType: 'lp-task-loop:reviewer', schema: REVIEW, label: `review #${n} security`, phase: 'Review' }),
        ])
        : [await agent(common + previous, { agentType: 'lp-task-loop:reviewer', schema: REVIEW, label: `review #${n}`, phase: 'Review' })]
      const ok = rvs.filter(Boolean)
      if (!ok.length) { status = 'ошибка агента'; break }
      reviewed = true
      const seen = new Set()
      const fs = ok.flatMap((r) => r.findings || []).filter((f) => !seen.has(f.file) && seen.add(f.file))
      reported.push(...fs.map(brief))
      blocking = fs.filter((f) => f.severity === 'critical' || f.severity === 'high').map((f) => ({ ...f, source: 'reviewer' }))
      nonBlocking = [...nonBlocking.filter((f) => !fs.some((g) => g.file === f.file)), ...fs.filter((f) => f.severity === 'medium' || f.severity === 'low')]

      // Final full skeptic pass if the last one did not cover every criterion.
      if (!blocking.length && !full && overBudget(n)) { status = 'лимит токенов'; prevSnap = snap; prevBlocking = []; break }
      if (!blocking.length && !full) {
        const fin = await agent(
          `Repo root: ${A.repo}\n\nTask:\n${A.task}\n\nCriteria to check (final pass, all of them):\n${criteriaList(CRITERIA)}\n\nDiff range: ${A.base} ${snap}.${evidence}`,
          { agentType: 'lp-task-loop:skeptic', schema: SKEPTIC, label: `skeptic final #${n}`, phase: 'Skeptic' },
        )
        if (fin) {
          lastSkeptic = fin
          remember(fin)
          blocking = fromSkeptic(fin)
        }
      }
    }
  }

  if (!blocking.length) { status = 'готово'; prevSnap = snap; prevBlocking = []; break }

  const prevFiles = new Set(prevBlocking.map(fileOf))
  const same = prevBlocking.length > 0 && blocking.length >= prevBlocking.length && blocking.every((f) => prevFiles.has(fileOf(f)))
  prevSnap = snap
  if (n === MAX) { prevBlocking = blocking; status = 'лимит итераций'; break }
  if (noChanges || same) { prevBlocking = blocking; status = 'нет прогресса'; break }

  // Soft checkpoint, at most once per loop: continue alone only on clear progress and under half of the budget.
  const fails = skRan ? failCount(lastSkeptic) : null
  if (!A.confirmed) {
    const onlyVerifier = blocking.every((b) => b.source === 'verifier')
    const passed = skRan ? (lastSkeptic.criteria || []).length - fails : 0
    const clear = onlyVerifier || (n === 1
      ? skRan && passed * 2 >= (lastSkeptic.criteria || []).length && blocking.length <= 3
      : blocking.length < prevBlocking.length || (fails !== null && prevFails !== null && fails < prevFails))
    checkpointReason = !clear ? 'прогресс неясен' : used() * 2 >= BUDGET ? 'потрачено больше половины лимита токенов' : ''
    if (checkpointReason) { prevBlocking = blocking; status = 'чекпоинт'; break }
  }
  if (fails !== null) prevFails = fails

  log(`Итерация ${n}: ${blocking.length} блокирующих (${[...new Set(blocking.map((b) => b.source))].join(', ')}) → доработка · ~${k(used())}/${k(BUDGET)} токенов`)
  prevBlocking = blocking
  // The next skeptic run rechecks the failed criteria; a final full pass runs before «готово».
  skepticCriteria = lastSkeptic ? CRITERIA.filter((c) => (lastSkeptic.criteria || []).some((r) => r.criterion === c && r.verdict === 'FAIL')) : CRITERIA
  if (!skepticCriteria.length) skepticCriteria = CRITERIA
}

return {
  status,
  iterations,
  blocker,
  checkpointReason,
  tokens: used(),
  budget: BUDGET,
  criteriaPassed: CRITERIA.filter((c) => critState[c] === 'PASS').length,
  criteriaTotal: CRITERIA.length,
  lastSnapshot: prevSnap,
  criteria: lastSkeptic ? lastSkeptic.criteria : [],
  blocking: prevBlocking,
  nonBlocking,
  verifier: lastVerifier ? lastVerifier.results : [],
  notDone,
}
