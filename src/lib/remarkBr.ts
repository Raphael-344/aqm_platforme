// Plugin remark : les balises <br> générées par le chatbot (souvent dans les cellules de tableau)
// deviennent de vrais sauts de ligne markdown. Aucun autre HTML n'est interprété : le reste
// est supprimé à l'affichage (option skipHtml de react-markdown).

type Noeud = { type: string; value?: string; children?: Noeud[] };

const BR = /^<br\s*\/?>$/i;

function remplacer(noeud: Noeud) {
  if (!noeud.children) return;
  noeud.children = noeud.children.map((enfant) =>
    enfant.type === 'html' && BR.test((enfant.value ?? '').trim()) ? { type: 'break' } : enfant
  );
  noeud.children.forEach(remplacer);
}

export default function remarkBr() {
  return (arbre: Noeud) => remplacer(arbre);
}
