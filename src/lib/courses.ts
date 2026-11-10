import { lessonDetails } from "./lesson-details";

export const EXPRESSION = `E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`;
export const LR_COUNTER = `S -> A a | b A c | B c | b B a
A -> d
B -> d`;
export const PRESETS = [
  {
    id: "expression",
    label: "Expressions · LL(1)",
    source: EXPRESSION,
    input: "id + id * id",
  },
  {
    id: "conflict",
    label: "Conflit FIRST/FIRST",
    source: "S -> a A | a B\nA -> c\nB -> d",
    input: "a c",
  },
  {
    id: "lr",
    label: "Collection canonique · C C",
    source: "S -> C C\nC -> c C | d",
    input: "c d d",
  },
  {
    id: "slr",
    label: "SLR(1), pas LR(0)",
    source: "E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id",
    input: "id + id",
  },
  {
    id: "counter",
    label: "LR(1), pas LALR(1)",
    source: LR_COUNTER,
    input: "b d a",
  },
  {
    id: "ambiguous",
    label: "Grammaire ambiguë",
    source: "E -> E + E | E * E | ( E ) | C\nC -> i | v",
    input: "i + v * i",
  },
  {
    id: "recursion",
    label: "Récursivité gauche",
    source: "A -> A a | b",
    input: "b a a",
  },
  {
    id: "nullable",
    label: "Suffixes nullables",
    source: "S -> A B C\nA -> a | ε\nB -> b | ε\nC -> c | ε",
    input: "a c",
  },
  {
    id: "transcript",
    label: "Conversation · p. 1 (vérifié par calcul)",
    source: "S -> A b\nA -> a A | C\nC -> c | ε",
    input: "a c b",
  },
  {
    id: "oran-td3-ll1",
    label: "Fiche TD 3 · LL(1) (S → Tac | Ued)",
    source: "S -> T a c | U e d\nT -> b T d | ε\nU -> c U d | ε",
    input: "c d e d",
  },
  {
    id: "oran-exam-2025",
    label: "Examen 2024/2025 · Ambigu & Priorités",
    source: "E -> E + E | E * E | id",
    input: "id + id * id",
  },
  {
    id: "oran-td-slr",
    label: "Fiche TD · SLR(1) (S → S a S b | ε)",
    source: "S -> S a S b | ε",
    input: "a b",
  },
  {
    id: "oran-td-lr-trace",
    label: "Fiche TD · Simulation LR (S → B B)",
    source: "S -> B B\nB -> a B | b",
    input: "a a b a a b",
  },
];
export type TableData = {
  headers: string[];
  headersEn?: string[];
  rows: string[][];
};
export type Section = {
  heading: string;
  headingEn: string;
  text: string;
  textEn: string;
  example?: string;
  table?: TableData;
};
export type LessonContent = {
  outcomes: string[];
  outcomesEn: string[];
  vocabulary: Record<string, string>;
  sections: Section[];
  pitfall: string;
  pitfallEn: string;
  lab: string;
  grammar?: string;
  prerequisite: string[];
  source?: { id: string; page: number };
};
export type CourseLesson = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  duration: number;
  content: LessonContent;
};
export type CourseModule = {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  lessons: CourseLesson[];
};
const section = (
  heading: string,
  headingEn: string,
  text: string,
  textEn: string,
  example?: string,
  table?: TableData,
): Section => ({ heading, headingEn, text, textEn, example, table });
const lesson = (
  id: string,
  title: string,
  titleEn: string,
  duration: number,
  content: LessonContent,
): CourseLesson => ({ id, slug: id, title, titleEn, duration, content });
export const modules: CourseModule[] = [
  {
    id: "introduction",
    title: "Introduction à la compilation",
    titleEn: "Introduction to compilation",
    description:
      "Du programme source aux unités lexicales : situer chaque analyse.",
    descriptionEn: "From source text to tokens: understand each analysis.",
    lessons: [
      lesson(
        "pipeline",
        "Une chaîne de transformations",
        "A pipeline of transformations",
        12,
        {
          outcomes: [
            "Situer lexer et parser.",
            "Distinguer les trois catégories d’erreurs.",
          ],
          outcomesEn: [
            "Locate the lexer and parser.",
            "Distinguish three error categories.",
          ],
          vocabulary: {
            compilateur: "compiler",
            "analyse lexicale": "lexical analysis",
            "analyse syntaxique": "syntax analysis",
            "analyse sémantique": "semantic analysis",
          },
          sections: [
            section(
              "Un contrat entre les phases",
              "A contract between phases",
              "Le lexer lit des caractères et produit des tokens. Le parser reçoit ces tokens et vérifie leur organisation avec une grammaire. L’analyse sémantique vérifie ensuite les déclarations et les types. Les dernières phases produisent du code ; elles restent ici au niveau du panorama.",
              "The lexer turns characters into tokens. The parser checks their arrangement against a grammar. Semantic analysis then checks declarations and types. Later stages produce code; this course only introduces them.",
              "source → lexèmes / tokens → arbre syntaxique → vérifications → code",
            ),
            section(
              "Localiser une erreur",
              "Locate an error",
              "Un caractère interdit est lexical. Un token valide à une place interdite est syntaxique. Une variable non déclarée peut être syntaxiquement correcte mais sémantiquement invalide. La catégorie dépend toujours du langage spécifié.",
              "An illegal character is a lexical error. A valid token in an illegal position is syntactic. An undeclared variable may parse correctly while failing semantic checks. Classification always depends on the language definition.",
              "@ : lexical, si @ est interdit\na := : syntaxique, expression manquante\na := b : sémantique, si b est non déclaré",
            ),
          ],
          pitfall:
            "Ne pas confondre une erreur de type et une erreur de grammaire.",
          pitfallEn: "Do not confuse type errors with grammar errors.",
          lab: "/lab/lexer",
          prerequisite: [],
        },
      ),
      lesson(
        "lexeme-token",
        "Lexème, token et modèle",
        "Lexeme, token and pattern",
        10,
        {
          outcomes: [
            "Distinguer une occurrence de sa classe.",
            "Expliquer le rôle de la table des symboles.",
          ],
          outcomesEn: [
            "Distinguish an occurrence from its category.",
            "Explain the symbol table.",
          ],
          vocabulary: {
            lexème: "actual character sequence",
            token: "category and optional attribute",
            modèle: "pattern",
          },
          sections: [
            section(
              "Occurrence et catégorie",
              "Occurrence and category",
              "Dans Int a, Int est un lexème de classe mot-clé ; a est un lexème de classe identificateur. Le token peut porter une référence vers la table des symboles. Deux occurrences de a partagent cette référence.",
              "In Int a, Int is a keyword lexeme and a is an identifier lexeme. A token may carry a symbol-table reference. Two occurrences of a share that reference.",
              "a := 10\nIDENT(1), ASSIGN, INTEGER(10)",
            ),
          ],
          pitfall: "Le nombre 10 est un lexème, entier est sa classe.",
          pitfallEn: "10 is a lexeme; integer is its category.",
          lab: "/lab/lexer",
          prerequisite: ["pipeline"],
        },
      ),
    ],
  },
  {
    id: "lexicale",
    title: "Analyse lexicale",
    titleEn: "Lexical analysis",
    description: "Scanner, reconnaître, puis expliquer chaque token.",
    descriptionEn: "Scan, recognize and explain every token.",
    lessons: [
      lesson(
        "fiche-1",
        "Fiche 1 · construire un analyseur",
        "Fiche 1 · build a scanner",
        20,
        {
          outcomes: [
            "Produire le flux de tokens exact.",
            "Construire une table de symboles sans doublons.",
          ],
          outcomesEn: [
            "Produce the exact token stream.",
            "Build a symbol table without duplicates.",
          ],
          vocabulary: {
            "mot-clé": "reserved word",
            "entier non signé": "unsigned integer",
            blanc: "whitespace",
          },
          sections: [
            section(
              "Le langage de cette fiche",
              "This sheet’s language",
              "Les mots-clés sont exactement Int, Si, alors, sinon, fsi. Les entiers sont non signés. Les seuls opérateurs sont := et <. Dans cette fiche, un ou plusieurs blancs séparent chaque lexème. Aucune règle de commentaire n’est ajoutée.",
              "Keywords are exactly Int, Si, alors, sinon, fsi. Integers are unsigned. Operators are := and <. For this sheet, one or more whitespace characters separate every lexeme. No comment rule is added.",
              "Int a\nInt b\na := 10\nb := a",
            ),
            section(
              "Mémoire et balayage manuel",
              "Memory and manual scanning",
              "Le programme est un tableau de caractères ; conserver la ligne et la colonne. Sauter les blancs, mémoriser le début, avancer jusqu’au blanc suivant, puis reconnaître le lexème. Tester les mots-clés avant les identificateurs. Tout lexème non reconnu produit une erreur localisée.",
              "Store the program in a character array and retain line/column positions. Skip whitespace, remember the start, scan to the next whitespace, then classify the lexeme. Check keywords before identifiers. Unrecognized lexemes produce located errors.",
              "tant que i < longueur(source)\n  sauter_blancs()\n  début ← i\n  avancer_jusqu’au_blanc()\n  reconnaître(source[début:i])",
            ),
            section(
              "Table des symboles",
              "Symbol table",
              "À la première occurrence d’un identificateur, créer une entrée ; aux occurrences suivantes, retrouver la même entrée. La déclaration et le type relèvent d’un traitement ultérieur ; le lexer ne les invente pas.",
              "On an identifier’s first occurrence, create an entry. Reuse it later. Declaration and type checking belong to later processing; the lexer does not invent them.",
              "1 : a\n2 : b",
            ),
          ],
          pitfall:
            "a:=10 est invalide pour la contrainte de séparation de cette fiche.",
          pitfallEn: "a:=10 violates this sheet’s whitespace constraint.",
          lab: "/lab/lexer",
          prerequisite: ["lexeme-token"],
        },
      ),
      lesson(
        "dfa",
        "Modèles réguliers et AFD",
        "Regular patterns and DFA",
        18,
        {
          outcomes: [
            "Suivre un AFD caractère par caractère.",
            "Distinguer état initial, final et puits.",
          ],
          outcomesEn: [
            "Trace a DFA character by character.",
            "Distinguish start, final and sink states.",
          ],
          vocabulary: {
            AFD: "deterministic finite automaton",
            "état puits": "sink state",
            "état final": "accepting state",
          },
          sections: [
            section(
              "Reconnaître un identificateur",
              "Recognize an identifier",
              "Convention de ce laboratoire : [A-Za-z][A-Za-z0-9_]*. q0 exige une lettre ; q1 accepte lettres, chiffres et _. Tout autre caractère conduit au puits. Un mot est accepté seulement si l’état après le dernier caractère est final.",
              "This lab uses [A-Za-z][A-Za-z0-9_]*. q0 requires a letter. q1 accepts letters, digits and _. Every other character reaches the sink. A string is accepted only if the state after its last character is final.",
              "q0 --lettre--> q1 (final)\nq1 --lettre/chiffre/_--> q1\nautres transitions → puits",
            ),
            section(
              "Analyse semi-automatique",
              "DFA-based scanning",
              "Remplacer les tests de reconnaissance par une table de transition. Mémoriser l’état et avancer d’un caractère. Dans un lexer général on applique souvent le plus long préfixe ; la Fiche 1 fournit déjà les frontières par les blancs.",
              "Replace recognition tests with a transition table. Retain the state and consume one character at a time. General lexers often use longest match; Fiche 1 already defines boundaries with whitespace.",
            ),
          ],
          pitfall:
            "Un état traversé qui était final ne garantit pas l’acceptation du mot entier.",
          pitfallEn:
            "Passing through a final state does not guarantee acceptance of the whole string.",
          lab: "/lab/automata",
          prerequisite: ["fiche-1"],
        },
      ),
    ],
  },
  {
    id: "grammaires",
    title: "Grammaires et dérivations",
    titleEn: "Grammars and derivations",
    description: "Des productions à une structure, sans supposer la priorité.",
    descriptionEn:
      "From productions to structure, without assuming precedence.",
    lessons: [
      lesson(
        "definition-g",
        "Définir G = (N, T, P, S)",
        "Define G = (N, T, P, S)",
        15,
        {
          outcomes: [
            "Identifier les quatre composantes.",
            "Distinguer ε et un terminal.",
          ],
          outcomesEn: [
            "Identify all four components.",
            "Distinguish ε from a terminal.",
          ],
          vocabulary: {
            axiome: "start symbol",
            "non-terminal": "nonterminal",
            production: "rewriting rule",
          },
          sections: [
            section(
              "Les quatre composantes",
              "The four components",
              "N contient les symboles remplaçables, T les symboles terminaux, P les productions et S ∈ N l’axiome. N et T sont disjoints. ε désigne le mot vide et ne doit pas être empilé comme un token.",
              "N contains replaceable symbols, T terminal symbols, P productions and S ∈ N the start symbol. N and T are disjoint. ε denotes the empty string and is never pushed as a token.",
              "S → a A | b\nA → c\nN={S,A}; T={a,b,c}; axiome=S",
            ),
          ],
          pitfall:
            "Le symbole $ marque la fin de l’entrée du parser ; il n’est pas un terminal ajouté à G.",
          pitfallEn:
            "$ marks the parser’s end of input; it is not an extra grammar terminal.",
          lab: "/lab/grammar",
          grammar: "S -> a A | b\nA -> c",
          prerequisite: ["pipeline"],
        },
      ),
      lesson(
        "derivations",
        "Dérivations gauche et droite",
        "Leftmost and rightmost derivations",
        20,
        {
          outcomes: [
            "Justifier le choix du non-terminal.",
            "Donner la suite des productions.",
          ],
          outcomesEn: [
            "Justify the chosen nonterminal.",
            "Write the production sequence.",
          ],
          vocabulary: {
            "dérivation gauche": "leftmost derivation",
            "dérivation droite": "rightmost derivation",
            "arbre syntaxique": "parse tree",
          },
          sections: [
            section(
              "Toujours la même direction",
              "Always follow the chosen direction",
              "Une dérivation gauche remplace à chaque étape le non-terminal le plus à gauche ; une dérivation droite celui le plus à droite. Le choix de la production reste libre si son membre gauche correspond au symbole choisi. Les numéros sont ceux des productions du problème.",
              "A leftmost derivation always expands the leftmost nonterminal; a rightmost derivation expands the rightmost. Any production whose left side matches that symbol may be used. Rule numbers belong to the supplied grammar.",
              "r1 E → A := B\nr2 B → A + B\nr3 B → id\nr4 A → id\nE ⇒ A := B ⇒ id := B ⇒ id := A + B ⇒ id := id + B ⇒ id := id + id\nSuite gauche : 1, 4, 2, 4, 3",
            ),
            section(
              "Arbre concret et abstrait",
              "Concrete and abstract tree",
              "L’arbre syntaxique contient les non-terminaux et les terminaux des productions. Un AST retire des détails selon une interprétation explicitement définie, par exemple les parenthèses et les non-terminaux auxiliaires. Il n’existe pas une projection AST universelle sans sémantique donnée.",
              "A parse tree contains production nonterminals and terminals. An AST removes details under an explicitly defined interpretation, such as parentheses and helper nonterminals. There is no universal AST projection without a specified interpretation.",
            ),
          ],
          pitfall:
            "L’analyse LR reconstruit une dérivation droite à l’envers ; ce n’est pas une dérivation gauche.",
          pitfallEn:
            "LR reconstructs a rightmost derivation in reverse; it is not a leftmost derivation.",
          lab: "/lab/grammar",
          grammar: "E -> A := B\nB -> A + B | id\nA -> id",
          prerequisite: ["definition-g"],
          source: { id: "study-transcript", page: 17 },
        },
      ),
      lesson("ambiguite", "Prouver une ambiguïté", "Prove ambiguity", 18, {
        outcomes: [
          "Exhiber deux arbres distincts.",
          "Ne pas imposer une priorité absente.",
        ],
        outcomesEn: [
          "Exhibit two distinct trees.",
          "Avoid imposing absent precedence.",
        ],
        vocabulary: {
          ambiguïté: "ambiguity",
          associativité: "associativity",
          priorité: "precedence",
        },
        sections: [
          section(
            "Deux structures pour un seul mot",
            "Two structures for one string",
            "Avec E → E+E | E*E | (E) | C et C → i | v, le mot i+v*i possède les structures i+(v*i) et (i+v)*i. Les deux sont autorisées. Il faut modifier la grammaire ou donner des règles explicites pour imposer la priorité usuelle.",
            "With E → E+E | E*E | (E) | C and C → i | v, i+v*i has structures i+(v*i) and (i+v)*i. Both are allowed. Change the grammar or give explicit rules to impose conventional precedence.",
            "E → E + E | E * E | ( E ) | C\nC → i | v",
          ),
        ],
        pitfall:
          "Ne trouver qu’un arbre dans une recherche bornée ne prouve pas la non-ambiguïté.",
        pitfallEn:
          "Finding one tree in a bounded search does not prove unambiguity.",
        lab: "/lab/grammar",
        grammar: PRESETS[5].source,
        prerequisite: ["derivations"],
      }),
    ],
  },
  {
    id: "preparation",
    title: "Préparer une grammaire",
    titleEn: "Prepare a grammar",
    description: "Éliminer la récursivité gauche et factoriser avec méthode.",
    descriptionEn: "Eliminate left recursion and factor methodically.",
    lessons: [
      lesson(
        "recursivite",
        "Éliminer la récursivité gauche",
        "Eliminate left recursion",
        20,
        {
          outcomes: [
            "Détecter la récursivité directe et indirecte.",
            "Appliquer la transformation standard.",
          ],
          outcomesEn: [
            "Detect direct and indirect recursion.",
            "Apply the standard transformation.",
          ],
          vocabulary: {
            "récursivité gauche": "left recursion",
            "alternative de base": "base alternative",
          },
          sections: [
            section(
              "La transformation directe",
              "The direct transformation",
              "Pour A → Aα | β, avec α non vide et une alternative de base β, écrire A → βA′ et A′ → αA′ | ε. Plusieurs α et β sont conservés. Un cycle A → A seul ne satisfait pas les hypothèses.",
              "For A → Aα | β, with nonempty α and a base alternative β, write A → βA′ and A′ → αA′ | ε. Preserve every α and β. A lone A → A cycle does not satisfy the assumptions.",
              "A → A a | b\nA → b A′\nA′ → a A′ | ε",
            ),
            section(
              "Le cas indirect",
              "The indirect case",
              "Ordonner les non-terminaux. Dans Ai, substituer les règles Ai → Ajγ pour j < i, puis supprimer la récursivité directe de Ai. Les cycles et ε exigent des précautions : le laboratoire refuse les cas hors de ses hypothèses.",
              "Order nonterminals. In Ai, substitute Ai → Ajγ for j < i, then eliminate Ai’s direct recursion. Cycles and ε require care: the lab refuses inputs beyond its transformation assumptions.",
            ),
          ],
          pitfall:
            "Supprimer une alternative récursive sans la réécrire change le langage.",
          pitfallEn:
            "Deleting a recursive alternative without rewriting it changes the language.",
          lab: "/lab/grammar",
          grammar: "A -> A a | b",
          prerequisite: ["definition-g"],
        },
      ),
      lesson("factorisation", "Factorisation gauche", "Left factoring", 15, {
        outcomes: [
          "Trouver un préfixe commun maximal.",
          "Préserver les suffixes vides.",
        ],
        outcomesEn: [
          "Find a longest common prefix.",
          "Preserve empty suffixes.",
        ],
        vocabulary: {
          "préfixe commun": "common prefix",
          "factorisation gauche": "left factoring",
        },
        sections: [
          section(
            "Reporter la décision",
            "Delay the decision",
            "Pour A → αβ1 | αβ2, introduire A → αA′ et A′ → β1 | β2. Si une alternative vaut α, son suffixe devient ε. Répéter jusqu’à disparition des préfixes communs non vides. Cette transformation ne suffit pas à garantir LL(1).",
            "For A → αβ1 | αβ2, introduce A → αA′ and A′ → β1 | β2. If an alternative is α itself, its suffix becomes ε. Repeat until no nonempty common prefix remains. Factoring alone does not guarantee LL(1).",
            "S → a A | a B\nS → a S′\nS′ → A | B",
          ),
        ],
        pitfall:
          "Factoriser ne signifie pas choisir arbitrairement une alternative.",
        pitfallEn:
          "Factoring does not mean arbitrarily choosing an alternative.",
        lab: "/lab/grammar",
        grammar: PRESETS[1].source,
        prerequisite: ["recursivite"],
      }),
    ],
  },
  {
    id: "ll1",
    title: "FIRST, FOLLOW et LL(1)",
    titleEn: "FIRST, FOLLOW and LL(1)",
    description: "Calculer jusqu’au point fixe, puis analyser avec une table.",
    descriptionEn: "Compute to a fixed point, then parse with a table.",
    lessons: [
      lesson(
        "first-follow",
        "Les ensembles FIRST et FOLLOW",
        "FIRST and FOLLOW sets",
        25,
        {
          outcomes: [
            "Calculer FIRST d’une suite nullable.",
            "Propager FOLLOW jusqu’au point fixe.",
          ],
          outcomesEn: [
            "Compute FIRST of a nullable sequence.",
            "Propagate FOLLOW to a fixed point.",
          ],
          vocabulary: {
            annulable: "nullable",
            "point fixe": "fixed point",
            suffixe: "suffix",
          },
          sections: [
            section(
              "FIRST : ce qui peut commencer",
              "FIRST: what can begin",
              "FIRST(X1…Xn) ajoute FIRST(X1) sans ε. Si X1 est annulable, continuer avec X2, etc. Ajouter ε seulement si tous les symboles de la suite sont annulables. Les ensembles grandissent jusqu’à stabilité.",
              "FIRST(X1…Xn) adds FIRST(X1) without ε. If X1 is nullable, continue with X2 and so on. Add ε only when every symbol is nullable. Sets grow until stable.",
            ),
            section(
              "FOLLOW : ce qui peut suivre",
              "FOLLOW: what can follow",
              "Initialiser FOLLOW(S) avec $. Pour A → αBβ, ajouter FIRST(β)−{ε} à FOLLOW(B). Si β est annulable, ajouter FOLLOW(A). Répéter : un seul passage ne suffit pas toujours. ε ne figure jamais dans FOLLOW.",
              "Initialize FOLLOW(S) with $. For A → αBβ, add FIRST(β)−{ε} to FOLLOW(B). If β is nullable, add FOLLOW(A). Repeat: one pass may be insufficient. ε never belongs to FOLLOW.",
              "E → T E′\nFIRST(E′)={+, ε} ⇒ + ∈ FOLLOW(T)\nE′ annulable ⇒ FOLLOW(E) ⊆ FOLLOW(T)\nFOLLOW(T)={+, ), $}",
            ),
          ],
          pitfall:
            "FOLLOW se calcule sur les suffixes de chaque occurrence, pas seulement sur le symbole suivant.",
          pitfallEn:
            "FOLLOW uses the suffix of every occurrence, not only the next symbol.",
          lab: "/lab/first-follow",
          grammar: EXPRESSION,
          prerequisite: ["factorisation"],
          source: { id: "study-transcript", page: 1 },
        },
      ),
      lesson(
        "table-ll1",
        "Construire la table LL(1)",
        "Construct the LL(1) table",
        25,
        {
          outcomes: [
            "Remplir toutes les cases prédictives.",
            "Justifier chaque conflit.",
          ],
          outcomesEn: [
            "Fill predictive table cells.",
            "Justify every conflict.",
          ],
          vocabulary: {
            "conflit FIRST/FIRST": "overlapping alternative starts",
            "conflit FIRST/FOLLOW": "nullable alternative conflict",
          },
          sections: [
            section(
              "Deux règles de remplissage",
              "Two insertion rules",
              "Pour A → α, placer la production dans M[A,a] pour chaque a ∈ FIRST(α)−{ε}. Si α est annulable, la placer dans M[A,b] pour chaque b ∈ FOLLOW(A). Une case avec plusieurs productions est un conflit ; conserver toutes les productions concurrentes.",
              "For A → α, insert the production in M[A,a] for each a ∈ FIRST(α)−{ε}. If α is nullable, insert it in M[A,b] for each b ∈ FOLLOW(A). Multiple productions in one cell form a conflict; retain them all.",
              "S → a A | a B\nM[S,a] = {r1, r2} : FIRST/FIRST",
            ),
            section(
              "Simuler la pile",
              "Simulate the stack",
              "Initialiser la pile avec S au-dessus de $. Si son sommet est un terminal égal au prochain token, consommer les deux. Sinon consulter M. Remplacer le non-terminal par le membre droit en respectant son ordre ; ε ne pousse rien. Accepter quand pile et entrée atteignent $.",
              "Start with S above $. Match and consume equal terminals. Otherwise consult M. Replace a nonterminal by the production’s right side in the correct order; ε pushes nothing. Accept when stack and input reach $.",
            ),
          ],
          pitfall:
            "La présence de récursivité gauche est un problème ; son absence ne prouve pas LL(1).",
          pitfallEn:
            "Left recursion is a problem, but its absence does not prove LL(1).",
          lab: "/lab/ll1",
          grammar: EXPRESSION,
          prerequisite: ["first-follow"],
        },
      ),
    ],
  },
  {
    id: "lr",
    title: "Analyse ascendante · famille LR",
    titleEn: "Bottom-up analysis · LR family",
    description:
      "Construire les états, comprendre les conflits, comparer les méthodes.",
    descriptionEn: "Build states, understand conflicts and compare methods.",
    lessons: [
      lesson("lr0", "Items, CLOSURE et GOTO", "Items, CLOSURE and GOTO", 30, {
        outcomes: [
          "Augmenter sans collision de nom.",
          "Construire la collection LR(0).",
        ],
        outcomesEn: [
          "Augment without name collisions.",
          "Construct the LR(0) collection.",
        ],
        vocabulary: {
          item: "production with a dot",
          fermeture: "closure",
          décalage: "shift",
          réduction: "reduce",
        },
        sections: [
          section(
            "Un point mesure ce qui est lu",
            "The dot marks what has been read",
            "Augmenter S par S′ → S. CLOSURE ajoute B → ·γ pour chaque item A → α·Bβ, jusqu’à stabilité. GOTO(I,X) déplace le point sur X dans tous les items concernés puis ferme l’ensemble. Réutiliser un état existant si les ensembles d’items sont identiques.",
            "Augment S with S′ → S. CLOSURE adds B → ·γ for every A → α·Bβ until stable. GOTO(I,X) moves the dot past X in matching items, then closes the set. Reuse existing states with identical item sets.",
            "S → C C\nC → c C | d\nI0 : S′→·S, S→·C C, C→·c C, C→·d",
          ),
          section(
            "La table LR(0)",
            "The LR(0) table",
            "Une transition terminale produit un shift. Une transition non-terminale produit GOTO. Un item terminé A → α· réduit sur tous les terminaux et $. L’item S′ → S· accepte seulement sur $. r2 désigne exactement la production numéro 2.",
            "A terminal transition yields a shift; a nonterminal transition yields GOTO. A completed A → α· reduces on every terminal and $. S′ → S· accepts only on $. r2 means production number 2.",
          ),
        ],
        pitfall:
          "Deux items terminés peuvent imposer deux réductions dans la même case.",
        pitfallEn:
          "Two completed items can impose competing reductions in one cell.",
        lab: "/lab/lr",
        grammar: PRESETS[2].source,
        prerequisite: ["table-ll1"],
        source: { id: "study-transcript", page: 57 },
      }),
      lesson(
        "slr",
        "Réductions guidées par FOLLOW",
        "Reductions guided by FOLLOW",
        25,
        {
          outcomes: [
            "Réutiliser les états LR(0).",
            "Expliquer un conflit évité par SLR.",
          ],
          outcomesEn: [
            "Reuse LR(0) states.",
            "Explain a conflict avoided by SLR.",
          ],
          vocabulary: {
            "SLR(1)": "simple LR with one-token lookahead",
            ACTION: "terminal-action table",
            GOTO: "nonterminal-state table",
          },
          sections: [
            section(
              "Même automate, autre table",
              "Same automaton, different table",
              "SLR garde la collection LR(0). Pour un item terminé A → α·, réduire seulement sur FOLLOW(A). Les décalages et l’acceptation restent identiques. FOLLOW est une approximation globale : certains conflits peuvent subsister.",
              "SLR retains the LR(0) collection. A completed A → α· reduces only on FOLLOW(A). Shifts and acceptance stay unchanged. FOLLOW is a global approximation, so conflicts may remain.",
              "E → E + T | T\nT → T * F | F\nF → ( E ) | id\nComparer LR(0) et SLR(1) dans le laboratoire.",
            ),
            section(
              "La trace ascendante",
              "The bottom-up trace",
              "Shift empile le token et l’état cible. Reduce dépile autant de symboles que le membre droit, puis consulte GOTO avec le membre gauche. Pour ε, ne dépiler aucun symbole. Une table conflictuelle ne détermine pas une action unique.",
              "Shift pushes a token and target state. Reduce pops as many symbols as the right side contains, then uses GOTO on the left side. An ε reduction pops no symbols. A conflicted table does not determine a unique action.",
            ),
          ],
          pitfall: "SLR ne calcule pas des lookaheads propres à chaque item.",
          pitfallEn: "SLR does not compute item-specific lookaheads.",
          lab: "/lab/lr",
          grammar: PRESETS[3].source,
          prerequisite: ["lr0"],
        },
      ),
      lesson(
        "lr1-lalr",
        "LR(1) canonique et fusion LALR",
        "Canonical LR(1) and LALR merging",
        35,
        {
          outcomes: [
            "Calculer FIRST(βa) dans CLOSURE.",
            "Expliquer une réduction concurrente créée par fusion.",
          ],
          outcomesEn: [
            "Compute FIRST(βa) in CLOSURE.",
            "Explain a reduce/reduce conflict introduced by merging.",
          ],
          vocabulary: {
            lookahead: "terminal anticipated after a reduction",
            "noyau LR(0)": "LR(0) core",
            "LALR(1)": "lookahead LR",
          },
          sections: [
            section(
              "Un lookahead dans chaque item",
              "A lookahead in each item",
              "Dans [A → α·Bβ, a], ajouter [B → ·γ, b] pour tout b ∈ FIRST(βa). Itérer même si seuls des lookaheads changent. Les états LR(1) distinguent les mêmes positions de points avec des anticipations différentes.",
              "For [A → α·Bβ, a], add [B → ·γ, b] for every b ∈ FIRST(βa). Iterate even when only lookaheads change. LR(1) states distinguish identical dot positions with different lookaheads.",
            ),
            section(
              "Fusionner et recalculer",
              "Merge and recompute",
              "LALR fusionne les états LR(1) qui ont le même ensemble d’items après suppression des lookaheads, puis fait l’union des lookaheads et reconstruit les tables. Cette fusion peut créer un conflit reduce/reduce. Ce n’est pas la méthode SLR.",
              "LALR merges LR(1) states whose item sets match after removing lookaheads, unions those lookaheads, then rebuilds tables. Merging may create reduce/reduce conflicts. This is not SLR.",
              "S → A a | b A c | B c | b B a\nA → d\nB → d\nLR(1) : sans conflit\nLALR(1) : conflits reduce/reduce",
            ),
            section(
              "Comparer les familles",
              "Compare the families",
              "LR(0) ⊆ SLR(1) ⊆ LALR(1) ⊆ LR(1). LL(1) est une classe descendante distincte. La classification affichée par le laboratoire provient des tables calculées pour la grammaire exacte saisie.",
              "LR(0) ⊆ SLR(1) ⊆ LALR(1) ⊆ LR(1). LL(1) is a separate top-down class. Lab classifications come from computed tables for the exact input grammar.",
            ),
          ],
          pitfall:
            "Un verdict de famille doit être justifié par les états et les cases de table.",
          pitfallEn:
            "A family classification needs item-state and table-cell evidence.",
          lab: "/lab/lr",
          grammar: LR_COUNTER,
          prerequisite: ["slr"],
        },
      ),
    ],
  },
  {
    id: "examens",
    title: "Préparation aux examens",
    titleEn: "Exam preparation",
    description: "Organiser une réponse courte, exacte et justifiée.",
    descriptionEn: "Write concise, exact and justified answers.",
    lessons: [
      lesson(
        "methode-examen",
        "La méthode sur une copie",
        "A method for exam answers",
        15,
        {
          outcomes: [
            "Présenter une preuve courte.",
            "Vérifier les invariants avant de conclure.",
          ],
          outcomesEn: [
            "Present a short proof.",
            "Check invariants before concluding.",
          ],
          vocabulary: {
            justification: "evidence for a result",
            barème: "grading rubric",
          },
          sections: [
            section(
              "Une réponse vérifiable",
              "A verifiable answer",
              "Écrire G et numéroter les productions. Calculer les ensembles jusqu’à stabilité. Remplir chaque case selon sa règle, conserver les conflits. Pour un verdict négatif, donner l’état, le terminal et les deux actions. Pour un mot, donner la trace jusqu’à accept ou error.",
              "Write G and number productions. Compute sets until stable. Fill cells using the insertion rules and retain conflicts. For a negative classification, name the state, terminal and competing actions. For a string, provide the trace through accept or error.",
            ),
            section(
              "Choisir une séance",
              "Choose a session",
              "15 minutes : pratique ciblée ; 30 minutes : TD mixte ; 60 ou 90 minutes : examen blanc. Les brouillons sont sauvegardés. En mode examen, les solutions et indices restent masqués jusqu’à la soumission. Les scores mesurent les réponses observées, sans prédire une note universitaire.",
              "15 minutes: focused practice. 30: mixed tutorial. 60 or 90: mock exam. Drafts are saved. Exam mode hides hints and solutions until submission. Scores describe observed answers and do not predict university grades.",
            ),
          ],
          pitfall:
            "Une table incomplète ne suffit pas pour conclure qu’une grammaire est déterministe.",
          pitfallEn:
            "An incomplete table cannot establish deterministic parsing.",
          lab: "/exams",
          prerequisite: ["lr1-lalr"],
        },
      ),
    ],
  },
];

// Include the full worked course in both the seed and public curriculum.
for (const course of modules) {
  for (const item of course.lessons) {
    item.content.sections.push(...(lessonDetails[item.id] ?? []));
    item.duration += (lessonDetails[item.id]?.length ?? 0) * 4;
  }
}
export const allLessons = modules.flatMap((m) =>
  m.lessons.map((l) => ({ ...l, moduleId: m.id })),
);
