UIUX_RULES v1
GOAL: avoid generic "AI-look"; ensure real usability

A_ANTI_GENERIC:
1 ground-in-subject: derive palette/type/layout from actual product/audience/page-job; no generic-brief default
2 avoid 3 AI-default-looks unless brief explicitly wants:
  (a) cream~#F4F1EA + high-contrast-serif + terracotta~#D97757
  (b) near-black + 1 neon/vermilion-accent
  (c) broadsheet/hairline/0-radius/dense-cols
3 typography: pair display+body fonts deliberately per project, not reused-default pair
4 structure=info: numbering/dividers/labels only if content is real sequence; no decorative 01/02/03
5 motion=deliberate: animation must serve a purpose; scattered/no-reason motion = AI-tell
6 one-signature: 1 memorable element, rest restrained; before ship ask "what can I remove"

B_USABILITY(nielsen-derived):
1 status-visible: immediate feedback on action
2 user-language: name features as user perceives, not system-internal terms
3 exit-always: undo/cancel/back esp. irreversible actions
4 consistency: same term/behavior/icon across product
5 prevent-errors: validate early, disable invalid actions, confirm dangerous ones
6 no-memory-burden: show needed context/choices inline, don't require recall
7 minimal: show only what's needed for current task
8 error-msg-useful: state what's wrong + how to fix, system voice, never vague/apologetic-only

C_COPY:
1 user-pov naming
2 active-voice, consistent action-name thru flow (btn"Save changes"->toast"Saved")
3 specific>clever
4 error/empty-state = direction not mood; explain+next-step
5 tone: concise, sentence-case, no filler/marketing-speak

D_ACCESS_RESPONSIVE:
1 responsive to mobile
2 visible keyboard focus state
3 respect prefers-reduced-motion
4 WCAG-AA contrast + touch-target size
5 never color-only for meaning; pair w/ icon/label

E_VERIFY_GATE seq,blocking:
1 subject-check: recognizably this brief, not swappable-generic
2 generic-check: diff vs A2 3-defaults; fix if matched w/o brief-reason
3 flow-walkthrough: happy-path + exits/cancels, not static-only
4 access-check: focus/contrast/mobile/reduced-motion pass
5 copy-check: reread all text incl errors/empty-states; no lorem-ipsum/placeholder
6 final-critique: screenshot+outsider-view; remove >=1 redundant detail before ship

F_REDFLAGS:
default-look-no-reason(cream+serif+terracotta|black+neon|broadsheet-hairline) |
decorative-numbering-non-sequence | gratuitous-gradient/fx | inconsistent-icon-styles |
generic-marketing-copy("Powerful.Simple.Fast.") | vague-CTA("Submit"/"Click here") |
vague-apologetic-error-no-fix | no-focus-state/not-responsive