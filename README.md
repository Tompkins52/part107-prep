# Part 107 Prep

A free, independent study site for the FAA Part 107 remote pilot certificate (the commercial drone license). Static HTML, CSS, and JavaScript with no build step, so it runs anywhere, including GitHub Pages.

Live site: https://tompkins52.github.io/part107-prep/

## What is in it

| Page | Contents |
| --- | --- |
| `index.html` | Overview, test facts, where to start |
| `process.html` | The certification process step by step: FTN, PSI scheduling, the UAG exam, IACRA, TSA vetting, registration, Remote ID, recurrent training |
| `study.html` | Study guide hub and a three-week plan |
| `study-regulations.html` | Module 1: Part 107 operating rules and certification |
| `study-airspace.html` | Module 2: airspace classes, sectional chart reading, special use airspace, TFRs, LAANC, with a practice chart |
| `study-weather.html` | Module 3: METAR and TAF decoding, stability, fronts, thunderstorms, fog, wind shear, density altitude |
| `study-performance.html` | Module 4: weight and balance, load factor, stalls, density altitude, batteries |
| `study-operations.html` | Module 5: preflight, CRM, ADM, emergencies, radio, airport operations, night, physiology, maintenance |
| `regulations.html` | 14 CFR Part 107 section by section, plus Part 89 (Remote ID) and Part 48 (registration) |
| `safety.html` | Go/no-go decision making, a printable preflight checklist, emergencies, battery safety, reporting |
| `exam.html` | Practice exam engine: full 60-question timed exam, 20-question quick check, topic quizzes, scoring, category breakdown, review, score history |
| `resources.html` | Official FAA links and useful tools |

## Practice exam

The question bank lives in `assets/js/bank.js` (more than 200 original questions across the five FAA knowledge areas). The engine in `assets/js/exam.js` draws questions in the same proportions the FAA publishes for the UAG test, shuffles answer order, times the full exam at 2 hours, scores at 70 percent, and keeps the last 20 attempts in the browser's local storage. Nothing is sent anywhere.

To add a question, append an object to the `questions` array:

```js
{ id: "reg-99", cat: "regulations", sub: "Operating limitations",
  q: "Question text?",
  a: ["Correct answer", "Distractor", "Distractor"], c: 0,
  x: "Explanation shown in review.", ref: "14 CFR 107.51" }
```

`cat` must be one of `regulations`, `airspace`, `weather`, `loading`, or `operations`. Set `fig: "chart"` to show the practice sectional chart with the question.

## Running locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Accuracy

Content was reviewed against FAA sources in October 2026. Regulations change. Before relying on anything here for a real flight, confirm it against the current 14 CFR Part 107 and FAA guidance. Corrections are welcome through issues and pull requests.

This site is not affiliated with or endorsed by the FAA.

## License

Code is released under the MIT License. Study content is released under Creative Commons Attribution 4.0 (CC BY 4.0).
