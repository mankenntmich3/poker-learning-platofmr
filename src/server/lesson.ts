import type { Lesson } from '@/shared/contracts';

export const LESSON_ID = 'kuhn-mixed-strategies-v1';
export const lesson: Lesson = {
  id: LESSON_ID,
  title: 'Warum eine gute Strategie manchmal mischt',
  subtitle: 'Verstehe Bluffs, Indifferenz und den Wert einer Entscheidung an einem kleinen, vollständig berechenbaren Spiel.',
  minutes: 8,
  category: 'Spieltheorie · Grundlagen',
  sections: [
    { title: 'Ein kleines Spiel mit echten Entscheidungen', body: 'Kuhn-Poker verwendet genau drei Karten: Bube, Dame und König. Beide Spieler zahlen einen Chip Ante und erhalten je eine Karte; die dritte bleibt verdeckt. Spieler 1 kann checken oder einen Chip setzen. Nach einem Check darf Spieler 2 checken oder setzen. Auf eine Bet folgen Call oder Fold. Ein Call beendet die Setzrunde. Beim Showdown gewinnt die höhere Karte. Diese Variante erklärt Spieltheorie; sie ist keine No-Limit-Hold’em-Range.' },
    { title: 'Weshalb selbst der Bube setzen kann', body: 'Mit dem Buben gewinnst du keinen Showdown. Eine Bet kann trotzdem einen positiven Beitrag zur Strategie leisten, wenn dein Gegner manchmal foldet. Würdest du ausschließlich mit dem König setzen, könnte dein Gegner seine mittleren Karten bedenkenlos wegwerfen. Bluffs verändern daher, wie profitabel dein Gegner auf deine starken Hände reagieren kann.' },
    { title: 'Mischen bedeutet nicht, beliebig zu spielen', body: 'Eine gemischte Strategie weist legalen Aktionen Wahrscheinlichkeiten zu. Der Solver berechnet diese aus dem vollständigen Kuhn-Spielbaum. In einem Gleichgewicht können mehrere Aktionen denselben Erwartungswert haben, obwohl sie verschieden oft gespielt werden. Eine seltene Aktion ist deshalb nicht automatisch ein Fehler. Wiederholtes Abweichen von den Frequenzen kann die gesamte Strategie jedoch ausnutzbar machen.' },
    { title: 'So liest du das Trainer-Feedback', body: 'Der Trainer bewertet den Erwartungswert deiner Aktion gegen die berechnete gegnerische Strategie. EV-Verlust ist die Differenz zum besten Aktionswert, gemessen in Chips. Nahezu null bedeutet eine gute einzelne Entscheidung. Die angezeigten Frequenzen helfen dir zusätzlich, langfristig passend zu mischen. Kleine numerische Abweichungen sind bei einer endlichen Zahl von Solver-Iterationen normal.' },
  ],
  takeaway: 'Bewerte eine einzelne Entscheidung nach ihrem Erwartungswert. Nutze die Frequenzen, um deine langfristige Strategie ausgewogen zu halten.',
  quiz: { question: 'Eine Aktion wird vom Solver nur selten gewählt. Ist sie deshalb immer ein Fehler?', options: [
    'Ja. Die häufigste Aktion ist bei jeder Entscheidung die einzig richtige.',
    'Nein. Mehrere Aktionen können denselben Erwartungswert haben; die Frequenzen steuern die langfristige Mischung.',
    'Nein. Solange eine Aktion legal ist, hat sie immer denselben Erwartungswert.',
  ] },
};

// Server-only answer: deliberately absent from the lesson API response.
export function isLessonAnswerCorrect(answer: number): boolean { return answer === 1; }
