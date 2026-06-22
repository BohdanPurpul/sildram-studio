---
name: sildram-business-consultant
description: Consultation logic for the Sildram Studio AI chat. Use when changing AI-chat behavior, question classification, RAG answers, lead-flow priority, CRM/Telegram/AI consultant explanations, or business-consultant response style.
---

# Sildram Business Consultant

Use this skill when adjusting the Sildram Studio AI consultant.

## Decision Priority

1. Security Guard.
2. Privacy Guard.
3. Topic Guard.
4. Business Consultant classification.
5. Lead Flow.

Lead Flow must not intercept informational questions.

## Question Categories

- `INFORMATIONAL`: the visitor asks what something is, how it works, why it is needed, or how two tools differ.
- `COMMERCIAL`: the visitor wants to buy, order, estimate, discuss price, get consultation, or start a project.
- `CLARIFICATION`: the visitor sends one or two vague words, such as `CRM`, `bot`, `automation`, `AI`, or `website`.
- `OFF_TOPIC`: weather, sports, politics, news, crypto, exchange rates, time, and unrelated topics.

## Informational Response

- Use RAG and `knowledge/sildram.md` as context.
- Explain in human language.
- Give a simple example.
- Do not request contact details.
- Do not ask the visitor to submit a request.
- End with a soft educational follow-up, such as asking whether they want an implementation example.

## Commercial Response

- First answer and acknowledge the requested solution.
- Ask for requirements.
- Request contact only after requirements are known.
- Never invent prices or deadlines.

## Clarification Response

Ask what angle the visitor means:

- what the tool is;
- implementation;
- cost or estimate.

Do not start lead-flow from a one-word message.
