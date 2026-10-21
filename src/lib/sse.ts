// Lecture d'un flux Server-Sent Events (format OpenAI / Groq) reçu en paquets arbitraires.
// Un paquet réseau peut couper une ligne n'importe où : la fin incomplète est gardée en
// tampon et complétée par le paquet suivant, puis traitée au flush en fin de flux.

export type SseParser = {
  /** Ajoute un paquet de texte décodé ; appelle onData pour chaque événement complet. */
  push(chunk: string): void;
  /** Fin du flux : traite la dernière ligne et le dernier événement restés en tampon. */
  flush(): void;
  /** Vrai une fois le marqueur de fin `[DONE]` reçu. */
  readonly done: boolean;
};

export function createSseParser(onData: (data: string) => void): SseParser {
  let tampon = '';
  let lignesData: string[] = [];
  let done = false;

  const dispatch = () => {
    if (lignesData.length === 0) return;
    const data = lignesData.join('\n');
    lignesData = [];
    if (data.trim() === '[DONE]') { done = true; return; }
    onData(data);
  };

  const traiterLigne = (ligneBrute: string) => {
    if (done) return;
    const ligne = ligneBrute.endsWith('\r') ? ligneBrute.slice(0, -1) : ligneBrute;
    if (ligne === '') { dispatch(); return; }          // ligne vide = fin d'un événement
    if (ligne.startsWith(':')) return;                  // commentaire / keep-alive
    if (ligne.startsWith('data:')) {
      lignesData.push(ligne.slice(5).replace(/^ /, ''));
    }
    // les autres champs (event:, id:, retry:) ne sont pas utilisés ici
  };

  return {
    push(chunk: string) {
      if (done) return;
      tampon += chunk;
      let fin: number;
      while ((fin = tampon.indexOf('\n')) !== -1) {
        traiterLigne(tampon.slice(0, fin));
        tampon = tampon.slice(fin + 1);
      }
    },
    flush() {
      if (tampon) traiterLigne(tampon);
      tampon = '';
      dispatch();
    },
    get done() { return done; },
  };
}
