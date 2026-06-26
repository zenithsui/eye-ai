import { getAllMemoryFacts, saveMemoryFact } from './storage';
import { tryGroq, tryGemini } from './ai-providers';

let msgCount = 0;

function showMemoryToast(count: number) {
  const toast = document.createElement('div');
  toast.className = 'memory-toast';
  toast.innerHTML = `🧠 ${count} new fact${count > 1 ? 's' : ''} yaad kar li`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

export async function extractAndSaveMemory(userMessage: string, aiResponse: string): Promise<void> {
  msgCount++;
  if (msgCount % 3 !== 0) return;

  const existingFacts = getAllMemoryFacts()
    .map(f => `${f.key}: ${f.value}`)
    .join('\n');

  const extractionPrompt = `You are a memory extraction system for a personal AI assistant.

Analyze this conversation exchange and extract NEW important facts about the user.
Only extract facts that are genuinely useful to remember long-term.

USER SAID: "${userMessage.slice(0, 200)}"
AI REPLIED: "${aiResponse.slice(0, 300)}"

EXISTING MEMORY (do not repeat these):
${existingFacts || 'none yet'}

EXTRACT facts in these categories ONLY if clearly mentioned:
- name (what the user wants to be called)
- job or profession
- city or location
- age or life stage
- skills (programming languages, tools they know)
- interests or hobbies
- goals or current projects they are working on
- preferences (language style, topics they like)
- family situation if mentioned
- any specific ongoing task they keep returning to

OUTPUT RULES — CRITICAL:
- Reply ONLY with a valid JSON array. No explanation, no markdown, no preamble.
- If nothing new to remember: reply with exactly []
- Format: [{"key": "fact_name", "value": "fact_value"}, ...]
- Keep values short — under 15 words each
- Use snake_case for keys: user_name, user_city, current_project, etc.
- Maximum 5 facts per extraction
- Example: [{"key": "user_name", "value": "Rahul"}, {"key": "current_project", "value": "React portfolio website"}]`;

  try {
    const result = await tryGroq(extractionPrompt, [])
      .catch(() => tryGemini(extractionPrompt, []))
      .catch(() => null);

    if (!result?.text) return;

    let text = result.text.trim().replace(/```json|```/g, '').trim();
    if (!text.startsWith('[')) return;

    const facts = JSON.parse(text);
    if (!Array.isArray(facts)) return;

    let saved = 0;
    facts.forEach((fact: any) => {
      if (fact.key && fact.value &&
          typeof fact.key === 'string' &&
          typeof fact.value === 'string') {
        saveMemoryFact(fact.key, fact.value);
        saved++;
      }
    });

    if (saved > 0) showMemoryToast(saved);
  } catch {
    // Never crash main chat for memory extraction errors
  }
}
