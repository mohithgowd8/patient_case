# CAREPATH AI — Accessibility & Clinical Usability (WCAG 2.1 AA)

## 1. Multilingual Support
Healthcare access requires eliminating language barriers. CAREPATH AI provides native multilingual intake in:
* **English** (`en`)
* **Hindi** (`hi` - हिन्दी)
* **Telugu** (`te` - తెలుగు)

All dynamic questions, entity extraction patterns, and clinical disclosures are localized across these languages.

## 2. Accessible User Interface (WCAG 2.1 AA)
* **High Contrast & Typography**: Form elements, text, and emergency status indicators meet minimum contrast ratios of 4.5:1.
* **Semantic HTML**: Proper heading hierarchy (`<h1>` to `<h3>`), `<main>`, `<nav>`, `<section>`, and `<button>` elements.
* **Screen Reader Compatibility**: ARIA attributes (`aria-label`, `aria-live="polite"`, `role="alert"`) communicate dynamic intake progress and emergency alerts without visual dependency.
* **Keyboard Navigation**: Full keyboard tab-order traversal across all intake forms, language selectors, and modal dialogs.

## 3. Multimodal Voice Intake
* Web Speech API integration allows speech-to-text intake for patients unable to type due to motor disability, acute pain, or low literacy.
* Visual microphone feedback indicates active recording and transcription state.
