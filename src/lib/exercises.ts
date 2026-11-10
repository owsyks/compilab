import { randomUUID } from "node:crypto";
import {
  ExerciseBody,
  Feedback,
  PublicExercise,
  Widget,
} from "./exercise-types";
import { EXPRESSION, LR_COUNTER } from "./courses";
import {
  CompilerError,
  parseGrammar,
  computeSets,
  buildLL1,
  serialize,
  leftRecursion,
  leftFactor,
  eliminateLeftRecursion,
} from "./compiler/grammar";
import { buildLR, actionText, itemText } from "./compiler/lr";
import { scanFiche1 } from "./compiler/lexer";
import { derive, Tree } from "./compiler/derivation";
export type SeedExercise = {
  id: string;
  topic: string;
  type: string;
  difficulty: number;
  provenance: string;
  body: ExerciseBody;
};
const bank: SeedExercise[] = [];
function add(
  topic: string,
  type: string,
  widget: Widget,
  title: string,
  titleEn: string,
  statement: string,
  statementEn: string,
  expected: unknown,
  extra: Partial<ExerciseBody> = {},
) {
  const id = `${topic}-${bank.filter((e) => e.topic === topic).length + 1}`;
  const hints =
    topic === "lexicale"
      ? [
          "Repérer les frontières imposées par les blancs.",
          "Tester les mots-clés avant les identificateurs, puis les entiers et les deux opérateurs.",
          "Les occurrences d’un même identificateur réutilisent la même entrée de table.",
        ]
      : topic === "lr"
        ? [
            "Observer le symbole immédiatement après le point.",
            "CLOSURE ajoute les productions du non-terminal attendu ; GOTO avance le point puis ferme.",
            "Une réduction LR(0) agit partout ; SLR utilise FOLLOW ; LR(1) utilise le lookahead de l’item.",
          ]
        : topic === "ll1"
          ? [
              "Distinguer FIRST (commencer) et FOLLOW (suivre). ε et $ ont des rôles différents.",
              "Pour A → αBβ : FIRST(β)−{ε} entre dans FOLLOW(B).",
              "Si β est annulable, propager FOLLOW(A), puis répéter jusqu’à stabilité.",
            ]
          : topic === "preparation"
            ? [
                "Séparer les préfixes communs ou les alternatives récursives des alternatives de base.",
                "Introduire un nouveau non-terminal sans supprimer une alternative.",
                "Un suffixe vide doit devenir ε ; la transformation doit préserver l’axiome.",
              ]
            : topic === "grammaires"
              ? [
                  "Les membres gauches sont des non-terminaux ; les autres symboles terminaux viennent des productions.",
                  "Une dérivation remplace exactement un non-terminal avec une production de même membre gauche.",
                  "Respecter la direction demandée et les numéros du problème.",
                ]
              : [
                  "Identifier le contrat de chaque phase : caractères, tokens, structure ou types.",
                  "Une erreur lexicale porte sur un lexème ; une erreur syntaxique porte sur leur organisation.",
                  "Justifier le résultat avec une définition ou une case précise de table.",
                ];
  const result =
    expected === null
      ? ""
      : typeof expected === "string"
        ? expected
        : JSON.stringify(expected);
  bank.push({
    id,
    topic,
    type,
    difficulty: 2,
    provenance:
      "Authored seed; objective answers checked by compiler engine where applicable",
    body: {
      title,
      titleEn,
      statement,
      statementEn,
      widget,
      expected,
      hints,
      explanation: `Résultat de référence : ${result}. Vérifier la définition, les frontières de tokens ou la règle de production correspondante ; aucun symbole supplémentaire n’est supposé.`,
      explanationEn: `Reference result: ${result}. Check the definition, token boundary or corresponding production rule; no additional symbol is assumed.`,
      rubric:
        "Each expected member/cell receives equal weight; extra members reduce precision. Open responses require review.",
      objective: type,
      prerequisites: [],
      ...extra,
    },
  });
}
add(
  "introduction",
  "multiple_choice",
  "choice",
  "Qui lit les caractères ?",
  "Who reads characters?",
  "Quelle phase transforme les caractères en tokens ?",
  "Which phase turns characters into tokens?",
  "Analyse lexicale",
  {
    options: ["Analyse lexicale", "Analyse syntaxique", "Génération de code"],
    explanation:
      "Le lexer regroupe les caractères en lexèmes et attribue les classes de tokens.",
    explanationEn:
      "The lexer groups characters into lexemes and assigns token categories.",
  },
);
add(
  "introduction",
  "lexical_error_classification",
  "choice",
  "Variable non déclarée",
  "Undeclared variable",
  "Une affectation syntaxiquement correcte utilise une variable non déclarée. Classer l’erreur.",
  "A syntactically valid assignment uses an undeclared variable. Classify the error.",
  "Sémantique",
  { options: ["Lexicale", "Syntaxique", "Sémantique"] },
);
add(
  "introduction",
  "multi_select",
  "multi",
  "Le contrat du parser",
  "The parser contract",
  "Sélectionner les responsabilités de l’analyse syntaxique.",
  "Select the parser’s responsibilities.",
  ["Vérifier la grammaire", "Construire un arbre"],
  {
    options: [
      "Vérifier la grammaire",
      "Construire un arbre",
      "Vérifier les types",
      "Allouer les registres",
    ],
  },
);
add(
  "introduction",
  "short_answer",
  "open",
  "Définir lexème et token",
  "Define lexeme and token",
  "Expliquer la différence avec un exemple.",
  "Explain the difference with one example.",
  null,
  {
    rubric:
      "2 points: occurrence of characters; 2: category/attribute; 1: consistent example.",
    explanation:
      "Un lexème est l’occurrence ; le token désigne sa catégorie et éventuellement un attribut.",
    explanationEn:
      "A lexeme is an occurrence; a token denotes its category and optional attribute.",
  },
);
const fiche = "Int a\nInt b\na := 10\nb := a";
add(
  "lexicale",
  "lexical_tokenization",
  "tokens",
  "Le flux de la Fiche 1",
  "The Fiche 1 token stream",
  "Associer chaque lexème à sa classe.",
  "Assign a category to each lexeme.",
  scanFiche1(fiche).tokens.map((t) => t.kind),
  { input: fiche },
);
add(
  "lexicale",
  "identifier_regex_or_DFA_validation",
  "multi",
  "Reconnaître les identificateurs",
  "Recognize identifiers",
  "Avec [A-Za-z][A-Za-z0-9_]*, sélectionner les identificateurs valides (avant le test des mots-clés).",
  "Using [A-Za-z][A-Za-z0-9_]*, select valid identifiers before keyword classification.",
  ["total2", "a_b"],
  { options: ["total2", "2total", "a_b", "_a", "a-b"] },
);
add(
  "lexicale",
  "lexical_error_classification",
  "choice",
  "Respecter les blancs",
  "Respect whitespace",
  "Pourquoi a:=10 est-il rejeté dans la Fiche 1 ?",
  "Why is a:=10 rejected in Fiche 1?",
  "Les lexèmes doivent être séparés par des blancs",
  {
    options: [
      "Les lexèmes doivent être séparés par des blancs",
      "Les entiers sont interdits",
      "Int est toujours nécessaire avant une affectation",
    ],
  },
);
add(
  "lexicale",
  "algorithmic_pseudocode_short_response",
  "open",
  "Écrire le balayage manuel",
  "Write the manual scanner",
  "Donner un algorithme qui saute les blancs et reconnaît les cinq classes de la Fiche 1.",
  "Give an algorithm that skips whitespace and recognizes the five Fiche 1 categories.",
  null,
  {
    rubric:
      "Whitespace loop 1; boundaries 1; keyword priority 1; identifier/integer/operator tests 1; located errors 1.",
    explanation:
      "Sauter les blancs ; m?moriser le d?but et la position ; lire jusqu?au prochain blanc ; tester Int/Si/alors/sinon/fsi, puis identificateur, entier, := et < ; r?utiliser la table des symboles ; sinon signaler ligne et colonne.",
    explanationEn:
      "Skip whitespace; remember the start and position; read to the next whitespace; test Int/Si/alors/sinon/fsi, then identifier, integer, := and <; reuse symbol-table entries; otherwise report line and column.",
  },
);
const simple = "S -> a A | b\nA -> c";
const sg = parseGrammar(simple);
add(
  "grammaires",
  "grammar_parts",
  "parts",
  "Compléter G",
  "Complete G",
  "Donner N, T et S pour cette grammaire. Séparer les membres par des virgules.",
  "Give N, T and S. Separate set members with commas.",
  { N: sg.nonterminals, T: sg.terminals, S: [sg.start] },
  { grammar: simple, fields: ["N", "T", "S"] },
);
const dg = "E -> A := B\nB -> A + B | id\nA -> id";
add(
  "grammaires",
  "leftmost_derivation",
  "sequence",
  "Sortie de l’analyse gauche",
  "Leftmost production sequence",
  "Donner les numéros des productions pour id := id + id, dérivation gauche.",
  "Give production numbers for id := id + id, leftmost derivation.",
  [1, 4, 2, 4, 3],
  { grammar: dg, input: "id := id + id", direction: "left" },
);
add(
  "grammaires",
  "rightmost_derivation",
  "sequence",
  "Dérivation droite",
  "Rightmost derivation",
  "Dériver id := id + id en développant le non-terminal le plus à droite.",
  "Derive id := id + id by always expanding the rightmost nonterminal.",
  [1, 2, 3, 4, 4],
  { grammar: dg, input: "id := id + id", direction: "right" },
);
add(
  "grammaires",
  "production_sequence",
  "sequence",
  "Une suite plus courte",
  "A shorter sequence",
  "Donner la suite gauche pour id := id.",
  "Give the leftmost production sequence for id := id.",
  [1, 4, 3],
  { grammar: dg, input: "id := id", direction: "left" },
);
add(
  "grammaires",
  "parse_tree",
  "tree",
  "Construire l’arbre de ac",
  "Build the tree of ac",
  "Construire l’arbre en choisissant une production pour chaque non-terminal.",
  "Build the tree by choosing a production for each nonterminal.",
  derive(sg, [1, 3]).tree,
  { grammar: simple, input: "a c" },
);
add(
  "grammaires",
  "abstract_tree",
  "choice",
  "AST d’une addition",
  "AST of an addition",
  "Projection explicitement donnée : retirer E, C et parenthèses, garder les opérateurs binaires. Quel AST décrit i+(v*i) ?",
  "Projection: remove E, C and parentheses; retain binary operators. Which AST describes i+(v*i)?",
  "+(i, *(v, i))",
  { options: ["+(i, *(v, i))", "*(+(i, v), i)", "+(i, v, *, i)"] },
);
add(
  "grammaires",
  "multiple_choice",
  "choice",
  "Deux arbres possibles",
  "Two possible trees",
  "E → E+E | E*E | i : peut-on imposer la priorité de * sans règle supplémentaire ?",
  "E → E+E | E*E | i: may we impose * precedence without another rule?",
  "Non",
  {
    options: ["Oui", "Non"],
    explanation:
      "Deux arbres de i+i*i prouvent l’ambiguïté. La grammaire ne fixe pas la priorité.",
    explanationEn:
      "Two trees for i+i*i prove ambiguity. The grammar gives no precedence.",
  },
);
add(
  "preparation",
  "eliminate_left_recursion",
  "grammar",
  "Supprimer A → Aa",
  "Eliminate A → Aa",
  "Transformer sans récursivité gauche. Utiliser A' pour le nouveau symbole.",
  "Remove left recursion. Use A' for the fresh symbol.",
  serialize(eliminateLeftRecursion(parseGrammar("A -> A a | b")).grammar),
  { grammar: "A -> A a | b", variant: "recursion" },
);
add(
  "preparation",
  "left_factor_grammar",
  "grammar",
  "Factoriser S",
  "Factor S",
  "Factoriser le préfixe commun ; utiliser S'.",
  "Factor the common prefix; use S'.",
  serialize(leftFactor(parseGrammar("S -> a A | a B\nA -> c\nB -> d")).grammar),
  { grammar: "S -> a A | a B\nA -> c\nB -> d", variant: "factor" },
);
add(
  "preparation",
  "multiple_choice",
  "choice",
  "La base β",
  "The base β",
  "Pour A → Aa | b, quelle alternative sert de β ?",
  "For A → Aa | b, which alternative is β?",
  "b",
  { options: ["a", "b", "Aa"] },
);
add(
  "preparation",
  "multi_select",
  "multi",
  "Les limites du procédé",
  "Transformation limits",
  "Quels cas demandent des précautions au-delà de la formule directe standard ?",
  "Which cases require care beyond the standard direct formula?",
  ["A → A", "A → Aa sans alternative de base"],
  { options: ["A → A", "A → Aa sans alternative de base", "A → Aa | b"] },
);
const eg = parseGrammar(EXPRESSION);
const sets = computeSets(eg);
for (const [kind, target] of [
  ["FIRST", "E"],
  ["FOLLOW", "T"],
  ["FOLLOW", "F"],
  ["FIRST", "E'"],
] as const)
  add(
    "ll1",
    kind === "FIRST" ? "FIRST_sets" : "FOLLOW_sets",
    "set",
    `${kind}(${target})`,
    `${kind}(${target})`,
    `Calculer ${kind}(${target}). Séparer les membres par des virgules.`,
    `Compute ${kind}(${target}). Separate members with commas.`,
    (kind === "FIRST" ? sets.first : sets.follow)[target],
    {
      grammar: EXPRESSION,
      target,
      variant: kind,
      explanation: sets.trace
        .filter((t) => t.kind === kind && t.symbol === target)
        .map((t) => `${t.added} : ${t.reason}`)
        .join("\n"),
      explanationEn: sets.trace
        .filter((t) => t.kind === kind && t.symbol === target)
        .map((t) => `${t.added}: ${t.reason}`)
        .join("\n"),
    },
  );
const ll = buildLL1(eg);
const llfields = ["E|id", "E'|+", "E'|$", "T|id", "T'|*", "F|("];
add(
  "ll1",
  "LL1_table_fill",
  "table",
  "Compléter M",
  "Complete M",
  "Saisir les numéros des productions dans les cases indiquées.",
  "Enter production numbers in the indicated cells.",
  Object.fromEntries(llfields.map((k) => [k, ll.table[k]])),
  { grammar: EXPRESSION, fields: llfields },
);
add(
  "ll1",
  "LL1_classification_and_conflict",
  "choice",
  "Le conflit [S,a]",
  "The [S,a] conflict",
  "S → aA | aB, A → c, B → d : quel conflit empêche LL(1) ?",
  "S → aA | aB, A → c, B → d: which conflict prevents LL(1)?",
  "FIRST/FIRST en [S,a]",
  {
    grammar: "S -> a A | a B\nA -> c\nB -> d",
    options: ["Aucun", "FIRST/FIRST en [S,a]", "FIRST/FOLLOW en [A,$]"],
  },
);
const cc = parseGrammar("S -> C C\nC -> c C | d");
const machine = buildLR(cc, "LR0");
add(
  "lr",
  "LR0_item_closure",
  "multi",
  "CLOSURE de l’état initial",
  "Initial state CLOSURE",
  "Sélectionner tous les items de I0, avec S' → ·S.",
  "Select every item in I0, starting with S' → ·S.",
  machine.states[0].map((i) => itemText(machine, i)),
  {
    grammar: "S -> C C\nC -> c C | d",
    options: [
      ...machine.states[0].map((i) => itemText(machine, i)),
      "S → C · C",
      "C → c · C",
    ],
  },
);
add(
  "lr",
  "GOTO",
  "choice",
  "GOTO sur d",
  "GOTO on d",
  "Depuis I0, quel item contient GOTO(I0,d) ?",
  "Which item belongs to GOTO(I0,d)?",
  "C → d ·",
  {
    grammar: "S -> C C\nC -> c C | d",
    options: ["C → d ·", "C → · d", "S → C C ·"],
  },
);
add(
  "lr",
  "LR_automaton_state_identification",
  "choice",
  "Compter les états LR(0)",
  "Count LR(0) states",
  "Combien d’états pour la collection LR(0) de cette grammaire augmentée ?",
  "How many states does this augmented grammar’s LR(0) collection have?",
  String(machine.states.length),
  { grammar: "S -> C C\nC -> c C | d", options: ["5", "6", "7", "10"] },
);
const actionfields = Object.keys(machine.action).slice(0, 5);
add(
  "lr",
  "ACTION_GOTO_table_fill",
  "table",
  "Lire ACTION",
  "Read ACTION",
  "Compléter les actions (sN, rN ou acc) pour les cases état|terminal.",
  "Fill actions (sN, rN or acc) for state|terminal cells.",
  Object.fromEntries(
    actionfields.map((k) => [k, machine.action[k].map(actionText)]),
  ),
  { grammar: "S -> C C\nC -> c C | d", fields: actionfields },
);
add(
  "lr",
  "LR_family_classification",
  "multi",
  "LR(1) sans LALR(1)",
  "LR(1) without LALR(1)",
  "Quelles méthodes ont une table sans conflit pour cette grammaire ?",
  "Which methods have a conflict-free table for this grammar?",
  (["LR0", "SLR", "LR1", "LALR"] as const).filter(
    (m) => buildLR(parseGrammar(LR_COUNTER), m).conflicts.length === 0,
  ),
  { grammar: LR_COUNTER, options: ["LR0", "SLR", "LR1", "LALR"] },
);
add(
  "lr",
  "parsing_trace_step",
  "choice",
  "Après un shift",
  "After a shift",
  "L’action s4 signifie quoi ?",
  "What does action s4 mean?",
  "Consommer le token et empiler l’état 4",
  {
    options: [
      "Appliquer la production 4",
      "Consommer le token et empiler l’état 4",
      "Accepter le mot",
    ],
  },
);
add(
  "examens",
  "multiple_choice",
  "choice",
  "Justifier un conflit",
  "Justify a conflict",
  "Quelle preuve suffit pour réfuter un verdict SLR(1) sur la table calculée ?",
  "Which evidence refutes SLR(1) for a computed table?",
  "Une case ACTION avec deux actions distinctes",
  {
    options: [
      "Beaucoup d’états",
      "Une case ACTION avec deux actions distinctes",
      "Une production récursive",
    ],
  },
);
add(
  "examens",
  "multi_select",
  "multi",
  "Vérifier ses ensembles",
  "Check your sets",
  "Choisir les invariants corrects.",
  "Choose the correct invariants.",
  ["ε ∉ FOLLOW(A)", "$ ∈ FOLLOW(S)"],
  { options: ["ε ∉ FOLLOW(A)", "$ ∈ FOLLOW(S)", "ε ∈ T"] },
);
add(
  "examens",
  "algorithmic_pseudocode_short_response",
  "open",
  "Expliquer une réduction",
  "Explain a reduction",
  "Décrire le dépilement et GOTO après r2, sans inventer la production r2.",
  "Describe popping and GOTO after r2 without inventing production r2.",
  null,
  {
    rubric:
      "Refer to actual r2 (1); pop RHS length, zero for ε (2); GOTO(previous state,LHS) (2).",
  },
);
add(
  "introduction",
  "multiple_choice",
  "choice",
  "Fiche TD 1 · Classification de x := b + ;",
  "Sheet TD 1 · Classification of x := b + ;",
  "Dans la Fiche TD n°1 d'Oran 1, l'instruction « x := b + ; » est invalide. Quelle phase du compilateur rejette cette instruction et pourquoi ?",
  "In Oran 1 Sheet TD 1, statement « x := b + ; » is rejected. Which compiler phase rejects it and why?",
  "Analyseur syntaxique (Parser) : opérande manquant après '+'",
  {
    options: [
      "Analyseur syntaxique (Parser) : opérande manquant après '+'",
      "Analyseur lexical (Scanner) : caractère inconnu",
      "Contrôleur sémantique : type non déclaré",
      "Optimiseur : instruction inutile",
    ],
    explanation:
      "L'analyseur lexical reconnaît '+' et ';', mais la grammaire exige une expression valide après l'opérateur arithmétique. Le rejet est donc syntaxique.",
    explanationEn:
      "The lexer recognizes '+' and ';', but the grammar requires a valid expression after the operator. The rejection is strictly syntactic.",
  },
);
add(
  "introduction",
  "multiple_choice",
  "choice",
  "Fiche TD 1 · Erreur sémantique c := b ;",
  "Sheet TD 1 · Semantic Error c := b ;",
  "Dans le programme de TD 1, la variable 'c' n'a pas été déclarée dans la section 'var', mais l'instruction « c := b ; » respecte la grammaire. Quelle phase signale l'erreur ?",
  "In the TD 1 program, variable 'c' was never declared in the 'var' block, yet « c := b ; » matches the grammar. Which phase reports the error?",
  "Analyse sémantique (Table des symboles)",
  {
    options: [
      "Analyse sémantique (Table des symboles)",
      "Analyse lexicale (Scanner)",
      "Analyse syntaxique (Parser)",
      "Génération de code intermédiaire",
    ],
    explanation:
      "La phrase respecte la syntaxe 'ident := ident ;'. Seul le contrôleur sémantique inspecte la table des symboles pour vérifier si 'c' a été préalablement déclarée.",
    explanationEn:
      "The statement matches syntax 'ident := ident ;'. Only the semantic analyzer consults the symbol table to check whether 'c' was declared.",
  },
);
add(
  "lexicale",
  "multiple_choice",
  "choice",
  "Fiche TD 1 · Automate et Expression des zéros",
  "Sheet TD 1 · DFA and Zero Pattern",
  "Quelle expression régulière sur Σ = {0, 1} décrit exactement les nombres binaires comportant au moins deux zéros (TD 1, Exo 1) ?",
  "Which regular expression over Σ = {0, 1} exactly describes binary words containing at least two zeros (TD 1, Ex 1)?",
  "1* 0 1* 0 (0+1)*",
  {
    options: [
      "1* 0 1* 0 (0+1)*",
      "(0+1)* 0 1*",
      "0 (0+1)* 0",
      "1* (0+1)* 0*",
    ],
    explanation:
      "Le premier 0 est précédé de 1*, le second 0 est précédé de 1*, et le reste du mot peut contenir n'importe quelle séquence de 0 et de 1.",
    explanationEn:
      "The first 0 is preceded by 1*, the second 0 is preceded by 1*, and the remainder can be any string of 0s and 1s.",
  },
);
add(
  "lexicale",
  "multiple_choice",
  "choice",
  "TP Flex · Rôle de yytext",
  "Lab Flex · Role of yytext",
  "Dans un analyseur généré avec Flex, quelle variable contient la chaîne de caractères du lexème reconnu ?",
  "In a scanner generated by Flex, which variable holds the character string of the matched lexeme?",
  "yytext",
  {
    options: ["yytext", "yyleng", "yylval", "yyin"],
    explanation:
      "yytext est un pointeur ou tableau de caractères contenant la chaîne exacte du lexème actuellement reconnu par le moteur Flex.",
    explanationEn:
      "yytext is a character pointer or array holding the exact text matched by the Flex scanner engine.",
  },
);
add(
  "lexicale",
  "multiple_choice",
  "choice",
  "TP Flex · Structure d'un fichier .l",
  "Lab Flex · Structure of a .l file",
  "Quel symbole sépare obligatoirement les sections d'un fichier Flex (.l) ?",
  "Which symbol strictly delimits the main sections of a Flex (.l) file?",
  "%%",
  {
    options: ["%%", "%{ %}", "//", "##"],
    explanation:
      "Le séparateur %% délimite obligatoirement la section des définitions, la section des règles régulières et la section des fonctions C.",
    explanationEn:
      "%% strictly delimits definitions, regular rules with C actions, and user C helper routines.",
  },
);
add(
  "grammaires",
  "sequence_choice",
  "sequence",
  "Fiche TD 2 · Analyse Gauche du mot id := id + id + id + id",
  "Sheet TD 2 · Leftmost Derivation of id := id + id + id + id",
  "Soit G : (1) E → A := B, (2) B → A + B, (3) B → id, (4) A → id. Donner la suite des numéros de productions pour la dérivation gauche (TD 2, Exo 3).",
  "For G : (1) E → A := B, (2) B → A + B, (3) B → id, (4) A → id. Give the sequence of production rule numbers for the leftmost derivation (TD 2, Ex 3).",
  [1, 4, 2, 4, 2, 4, 2, 4, 3],
  {
    grammar: dg,
    input: "id := id + id + id + id",
    direction: "left",
    explanation:
      "E ⇒(1) A:=B ⇒(4) id:=B ⇒(2) id:=A+B ⇒(4) id:=id+B ⇒(2) id:=id+A+B ⇒(4) id:=id+id+B ⇒(2) id:=id+id+A+B ⇒(4) id:=id+id+id+B ⇒(3) id:=id+id+id+id.",
    explanationEn:
      "Leftmost derivation: expands A first (1,4), then expands B three times with rule 2 and A with rule 4, finishing with rule 3.",
  },
);
add(
  "ll1",
  "multi_select",
  "multi",
  "Fiche TD 3 · Vérification du théorème LL(1)",
  "Sheet TD 3 · LL(1) Theorem Validation",
  "Pour la grammaire S → Tac | Ued, T → bTd | ε, U → cUd | ε (TD 3, Exo 1), quelles conditions garantissent l'absence de conflit dans la table LL(1) ?",
  "For grammar S → Tac | Ued, T → bTd | ε, U → cUd | ε (TD 3, Ex 1), which conditions guarantee the absence of conflicts in the LL(1) table?",
  [
    "FIRST(Tac) ∩ FIRST(Ued) = ∅",
    "FIRST(bTd) ∩ FOLLOW(T) = ∅",
    "FIRST(cUd) ∩ FOLLOW(U) = ∅",
  ],
  {
    options: [
      "FIRST(Tac) ∩ FIRST(Ued) = ∅",
      "FIRST(bTd) ∩ FOLLOW(T) = ∅",
      "FIRST(cUd) ∩ FOLLOW(U) = ∅",
      "FOLLOW(S) = ∅",
    ],
    explanation:
      "Le théorème LL(1) exige la disjointure des ensembles FIRST pour chaque choix d'alternative, et pour chaque symbole annulable, la disjointure entre FIRST et FOLLOW.",
    explanationEn:
      "The LL(1) theorem requires disjoint FIRST sets between alternatives, and for nullable rules, disjoint FIRST and FOLLOW sets.",
  },
);
add(
  "lr",
  "multiple_choice",
  "choice",
  "Examen Oran 1 2024/2025 · Déduction LL(1) depuis LR(1)",
  "Oran 1 2024/2025 Exam · LL(1) Deduction from LR(1)",
  "Dans l'épreuve d'Oran 1, la grammaire E → E + E / E * E / id sans priorité présente un conflit décalage/réduction dans I3. Que peut-on déduire sur son statut LL(1) sans calculer la table LL(1) ?",
  "In the Oran 1 exam, grammar E → E + E / E * E / id without precedence has a shift/reduce conflict in I3. What can be deduced about its LL(1) status without building the LL(1) table?",
  "Elle n'est pas LL(1) par contraposée : LL(1) ⇒ LR(1) donc non-LR(1) ⇒ non-LL(1)",
  {
    options: [
      "Elle n'est pas LL(1) par contraposée : LL(1) ⇒ LR(1) donc non-LR(1) ⇒ non-LL(1)",
      "Elle est obligatoirement LL(1)",
      "On ne peut rien déduire car LR(1) n'a aucun lien avec LL(1)",
      "Elle est SLR(1) mais pas LL(1)",
    ],
    explanation:
      "Toute grammaire LL(1) est reconnue par la famille LR(1). Par contraposée, si une grammaire échoue à être LR(1), elle ne peut en aucun cas être LL(1).",
    explanationEn:
      "Every LL(1) grammar is recognized by canonical LR(1). By contraposition, failing LR(1) implies it cannot be LL(1).",
  },
);
add(
  "lr",
  "multiple_choice",
  "choice",
  "Contre-exemple canonique · Nature du conflit LALR(1)",
  "Canonical Counterexample · Nature of the LALR(1) Conflict",
  "Pour la grammaire canonique S → aAd | bBd | aBe | bAe, A → c, B → c, quel conflit est introduit par la fusion des états I6 et I9 en j6 ?",
  "For the canonical grammar S → aAd | bBd | aBe | bAe, A → c, B → c, which conflict is created when merging states I6 and I9 into j6?",
  "Conflit Réduction/Réduction sur 'd' et 'e' (r5 et r6)",
  {
    options: [
      "Conflit Réduction/Réduction sur 'd' et 'e' (r5 et r6)",
      "Conflit Décalage/Réduction sur 'c'",
      "Conflit Décalage/Décalage sur 'a' et 'b'",
      "Aucun conflit, la table LALR reste déterministe",
    ],
    explanation:
      "I6 contient [A→c·, d] et [B→c·, e]. I9 contient [A→c·, e] et [B→c·, d]. En fusionnant en j6, les deux réductions r5 et r6 sont actives simultanément sur 'd' et sur 'e'.",
    explanationEn:
      "I6 has [A→c·, d] and [B→c·, e]; I9 has [A→c·, e] and [B→c·, d]. Merging into j6 activates both reductions r5 and r6 on both 'd' and 'e'.",
  },
);
add(
  "lr",
  "multiple_choice",
  "choice",
  "Fiche TD SLR · Placement des réductions",
  "Sheet TD SLR · Placement of Reductions",
  "Dans l'analyse SLR(1) de S → SaSb | λ (règles 1 et 2), sous quelles colonnes la réduction r2 (S → λ) est-elle inscrite pour l'état I0 ?",
  "In SLR(1) parsing of S → SaSb | λ (rules 1 and 2), under which columns is reduction r2 (S → λ) inserted for state I0?",
  "Sous 'a', 'b' et '$' car FOLLOW(S) = {a, b, $}",
  {
    options: [
      "Sous 'a', 'b' et '$' car FOLLOW(S) = {a, b, $}",
      "Sous tous les terminaux de l'alphabet Σ",
      "Uniquement sous '$'",
      "Uniquement sous 'a'",
    ],
    explanation:
      "En méthode SLR(1), une réduction A → α est placée exclusivement sous les symboles terminaux appartenant à FOLLOW(A). Ici FOLLOW(S) = {a, b, $}.",
    explanationEn:
      "In SLR(1), reduction A → α is placed strictly under terminals in FOLLOW(A). Here FOLLOW(S) = {a, b, $}.",
  },
);
export const exerciseBank = bank;
export function publicExercise(e: SeedExercise): PublicExercise {
  const { expected: _, explanation: __, explanationEn: ___, ...body } = e.body;
  void _;
  void __;
  void ___;
  return {
    ...body,
    id: e.id,
    topic: e.topic,
    type: e.type,
    difficulty: e.difficulty,
    provenance: e.provenance,
  };
}
export function members(value: unknown): string[] {
  return [
    ...new Set(
      (Array.isArray(value)
        ? value.map(String)
        : String(value ?? "")
            .replace(/[{}]/g, "")
            .split(/[,;\n]+/)
      )
        .map((s) => s.trim().replace(/^r(?=\d+$)/, ""))
        .filter(Boolean),
    ),
  ].sort();
}
export function compareMembers(expected: unknown, answer: unknown) {
  const e = members(expected),
    a = members(answer);
  const missing = e.filter((x) => !a.includes(x)),
    extra = a.filter((x) => !e.includes(x));
  const common = e.length - missing.length;
  return {
    missing,
    extra,
    score: e.length + a.length ? (2 * common) / (e.length + a.length) : 1,
  };
}
const normalizedTree = (tree: Tree): unknown => ({
  symbol: tree.symbol,
  children: tree.children.map(normalizedTree),
});
export function grade(
  body: ExerciseBody,
  answer: unknown,
  language = "fr",
): Feedback {
  const base = {
    answer,
    expected: body.expected,
    why: language === "en" ? body.explanationEn : body.explanation,
    rubric: body.rubric,
  };
  if (body.widget === "open")
    return {
      ...base,
      score: null,
      correct: false,
      status: "needs_manual_review",
      missing: [],
      extra: [],
    };
  let score = 0;
  let missing: string[] = [];
  let extra: string[] = [];
  if (["set", "multi"].includes(body.widget)) {
    ({ score, missing, extra } = compareMembers(body.expected, answer));
  } else if (["table", "parts"].includes(body.widget)) {
    const expected = body.expected as Record<string, unknown>;
    const actual = (
      answer && typeof answer === "object" ? answer : {}
    ) as Record<string, unknown>;
    const keys = Object.keys(expected);
    score =
      keys.reduce((sum, k) => {
        const c = compareMembers(expected[k], actual[k]);
        missing.push(...c.missing.map((m) => `${k}: ${m}`));
        extra.push(...c.extra.map((m) => `${k}: ${m}`));
        return sum + c.score;
      }, 0) / keys.length;
  } else if (body.widget === "sequence") {
    try {
      const rules = String(answer ?? "")
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      const d = derive(parseGrammar(body.grammar!), rules, body.direction);
      score = d.forms.at(-1)!.join(" ") === body.input ? 1 : 0;
    } catch {
      score = 0;
    }
  } else if (body.widget === "grammar") {
    try {
      const actual = parseGrammar(String(answer));
      const expected = parseGrammar(String(body.expected));
      const canonical = (g: ReturnType<typeof parseGrammar>) =>
        g.productions
          .map((p) => `${p.lhs}→${JSON.stringify(p.rhs)}`)
          .sort()
          .join("\n");
      score = canonical(actual) === canonical(expected) ? 1 : 0;
      if (body.variant === "recursion" && leftRecursion(actual).length)
        score = 0;
    } catch {
      score = 0;
    }
  } else if (body.widget === "tree") {
    try {
      score =
        JSON.stringify(normalizedTree(answer as Tree)) ===
        JSON.stringify(normalizedTree(body.expected as Tree))
          ? 1
          : 0;
    } catch {
      score = 0;
    }
  } else if (body.widget === "tokens") {
    const e = body.expected as string[];
    const a = Array.isArray(answer) ? answer : [];
    score =
      e.filter((x, i) => x === a[i]).length / Math.max(e.length, a.length, 1);
    e.forEach((x, i) => {
      if (x !== a[i]) missing.push(`${i + 1}: ${x}`);
    });
  } else
    score =
      String(answer ?? "").trim() === String(body.expected).trim() ? 1 : 0;
  return {
    ...base,
    score,
    correct: score === 1,
    status: "scored",
    missing,
    extra,
  };
}
export function generateVerified(
  topic: string,
  difficulty: number,
  count: number,
  options: { type?: string; grammar?: string; target?: string } = {},
): SeedExercise[] {
  const generated: SeedExercise[] = [];
  if (
    options.grammar &&
    (topic !== "ll1" ||
      (options.type && !["FIRST_sets", "FOLLOW_sets"].includes(options.type)))
  )
    throw new CompilerError(
      "Custom grammar generation supports FIRST/FOLLOW only.",
    );
  if (topic === "ll1") {
    if (options.type && !["FIRST_sets", "FOLLOW_sets"].includes(options.type))
      return bank
        .filter((e) => e.topic === topic && e.type === options.type)
        .slice(0, count)
        .map((e) => ({
          ...e,
          id: randomUUID(),
          provenance: `Verified bank selection: ${e.id}`,
        }));
    const letters = "abcdefghijklmnopqrst"
      .split("")
      .sort(() => Math.random() - 0.5);
    const custom = options.grammar ? parseGrammar(options.grammar) : null;
    if (
      custom &&
      options.target &&
      !custom.nonterminals.includes(options.target)
    )
      throw new CompilerError("Unknown target nonterminal in your grammar.");
    const customTargets = custom
      ? options.target
        ? [options.target]
        : custom.nonterminals
      : [];
    const limit = custom
      ? Math.min(count, customTargets.length * (options.type ? 1 : 2))
      : count;
    for (let i = 0; i < limit; i++) {
      const terminal = letters[i % letters.length];
      const other = terminal === "z" ? "y" : "z";
      const examples = [
        `S -> ${terminal} A | ${other}\nA -> x`,
        `S -> A ${other}\nA -> ${terminal} A | ε`,
        `S -> A B ${other}\nA -> ${terminal} | ε\nB -> x | ε`,
        `S -> A A B\nA -> ${terminal} | ε\nB -> ${other} | ε`,
        `S -> A B A\nA -> ${terminal} A | ε\nB -> ${other} B | ε`,
      ];
      const grammar = options.grammar || examples[difficulty - 1];
      const g = custom ?? parseGrammar(grammar);
      const variant =
        options.type === "FIRST_sets"
          ? "FIRST"
          : options.type === "FOLLOW_sets"
            ? "FOLLOW"
            : custom
              ? Math.floor(i / Math.max(1, customTargets.length)) % 2
                ? "FIRST"
                : "FOLLOW"
              : i % 2
                ? "FIRST"
                : "FOLLOW";
      const target = custom ? customTargets[i % customTargets.length] : "A";
      const sets = computeSets(g);
      const expected =
        variant === "FIRST" ? sets.first[target] : sets.follow[target];
      generated.push({
        id: randomUUID(),
        topic,
        type: variant + "_sets",
        difficulty,
        provenance: "Deterministic original variant; solver-validated",
        body: {
          ...bank.find((e) => e.topic === "ll1")!.body,
          title: `${variant}(${target}) · variante`,
          titleEn: `${variant}(${target}) · variant`,
          statement: `Calculer ${variant}(${target}).`,
          statementEn: `Compute ${variant}(${target}).`,
          grammar,
          widget: "set",
          variant,
          target,
          expected,
          explanation: sets.trace
            .filter((t) => t.kind === variant && t.symbol === target)
            .map((t) => `${t.added}: ${t.reason}`)
            .join("\n"),
          explanationEn: sets.trace
            .filter((t) => t.kind === variant && t.symbol === target)
            .map((t) => `${t.added}: ${t.reason}`)
            .join("\n"),
        },
      });
    }
    return generated;
  }
  const candidates = bank
    .filter(
      (e) =>
        (!topic || e.topic === topic) &&
        (!options.type || e.type === options.type),
    )
    .sort(() => Math.random() - 0.5);
  return candidates
    .slice(0, count)
    .map((e) => ({
      ...e,
      id: randomUUID(),
      provenance: `Verified bank selection: ${e.id}`,
    }));
}
