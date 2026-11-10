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
    id: "oran-td2-grammaire",
    label: "Fiche TD 2 · Grammaire (E → A:=B)",
    source: "E -> A := B\nB -> A + B | id\nA -> id",
    input: "id := id + id",
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
    id: "tp-flex",
    title: "TP Pratique · Flex & Analyse Lexicale",
    titleEn: "Practical Lab · Flex & Lexical Analysis",
    description: "Du fichier .l au code C exécutable : concevoir des scanners performants.",
    descriptionEn: "From .l specification to compiled C: build robust lexical scanners.",
    lessons: [
      lesson(
        "tp-flex-bases",
        "Prise en main de Flex & Premiers Scanners",
        "Getting Started with Flex & First Scanners",
        20,
        {
          outcomes: [
            "Comprendre le flux de compilation Flex (.l -> flex -> lex.yy.c -> gcc -> binaire).",
            "Structurer un fichier Flex en 3 sections délimitées par %%.",
            "Programmer et tester des scanners pour binaire, inversion et comptage de lignes.",
          ],
          outcomesEn: [
            "Understand the Flex compilation workflow (.l -> flex -> lex.yy.c -> gcc -> binary).",
            "Structure a Flex file in 3 sections separated by %%.",
            "Write and test scanners for binary strings, character swapping, and line counting.",
          ],
          vocabulary: {
            Flex: "Fast Lexical Analyzer Generator",
            "lex.yy.c": "C source file produced by Flex containing yylex()",
            yytext: "pointer to the matched input token characters",
            "yywrap()": "end-of-file callback function returning 1 to finish",
          },
          sections: [
            section(
              "Le flux de compilation Flex",
              "The Flex compilation flow",
              "Flex lit un fichier source .l contenant des règles de traduction et produit un analyseur en C nommé lex.yy.c. Ce fichier C est ensuite compilé avec gcc pour générer un exécutable. Le moteur généré implémente la fonction yylex() qui parcourt le flux d'entrée caractère par caractère selon les automates finis déterminisés générés.",
              "Flex takes a .l specification file and generates a C source file called lex.yy.c. That C file is compiled with gcc into an executable scanner. The generated engine implements yylex(), which consumes input characters according to generated deterministic finite automata.",
              "Compilation sous Linux / Windows :\n$ flex scan.l           # Produit lex.yy.c\n$ gcc -o scan lex.yy.c   # Compile le scanner en C\n$ ./scan < entree.txt   # Exécute l'analyseur sur les données",
            ),
            section(
              "Structure canonique à trois sections",
              "Canonical three-section structure",
              "Un fichier Flex est divisé en trois parties obligatoires séparées par %% : (1) La section des déclarations et code C littéral entre %{ et %}, (2) La section des règles associant chaque motif régulier à une action en code C, (3) La section du code C utilisateur contenant main() et yywrap().",
              "A Flex file is divided into three mandatory parts separated by %%: (1) Declarations and literal C headers between %{ and %}, (2) Rules associating regular patterns with C actions, (3) User C subroutines containing main() and yywrap().",
              "%{\n#include <stdio.h>\n%}\n\n%%\n(0|1)+    { printf(\"Binaire reconnu : %s\\n\", yytext); }\n[0-9]+    { printf(\"Décimal : %s\\n\", yytext); }\n.         ; /* Ignorer les autres caractères */\n%%\n\nint yywrap() { return 1; }\nint main() { yylex(); return 0; }",
            ),
          ],
          pitfall: "Oublier d'implémenter yywrap() ou d'ajouter l'option %option noyywrap conduit à une erreur d'édition de liens 'undefined reference to yywrap'.",
          pitfallEn: "Omitting yywrap() or %option noyywrap results in a linker error 'undefined reference to yywrap'.",
          lab: "/lab/lexer",
          prerequisite: ["fiche-1", "dfa"],
        },
      ),
      lesson(
        "tp-flex-avance",
        "Règles, Variables & Fonctions Flex",
        "Flex Rules, Variables & Functions",
        25,
        {
          outcomes: [
            "Utiliser la gamme complète des métacaractères d'expressions régulières Flex.",
            "Manipuler les variables système yytext, yyleng, yylineno, yyin et yyout.",
            "Contrôler le flux avec yylex(), unput(), ECHO et %option yylineno.",
          ],
          outcomesEn: [
            "Use the full range of Flex regular expression metacharacters.",
            "Operate system variables yytext, yyleng, yylineno, yyin and yyout.",
            "Control scanning flow with yylex(), unput(), ECHO, and %option yylineno.",
          ],
          vocabulary: {
            yyleng: "length of the currently matched token string",
            yylineno: "automatic line counter variable managed by Flex",
            unput: "function pushing a character back onto the input stream",
            ECHO: "macro outputting the current matched token to yyout",
          },
          sections: [
            section(
              "Variables et fonctions système intégrées",
              "Built-in system variables and functions",
              "Flex expose des variables globales essentielles : yytext pointe sur la chaîne reconnue, yyleng contient sa longueur exacte, yylineno fournit le numéro de ligne (avec %option yylineno), yyin pointe vers le flux d'entrée (stdin par défaut), et yyout vers la sortie. Les fonctions comme yylex() lancent le scanner, unput(c) réinjecte un caractère, et yyterminate() force l'arrêt.",
              "Flex provides essential global variables: yytext points to the matched lexeme, yyleng gives its exact length, yylineno tracks line numbers (%option yylineno), yyin points to input (stdin by default), and yyout to output. Functions include yylex() which drives scanning, unput(c) which puts a character back, and yyterminate() which stops execution.",
              "/* Exemple d'utilisation de yyleng et yylineno */\n[a-zA-Z]+ {\n    printf(\"Mot à la ligne %d de longueur %d : %s\\n\", yylineno, yyleng, yytext);\n}",
            ),
            section(
              "Scanner complet : Test.l",
              "Complete scanner: Test.l",
              "Dans le TP de l'Université d'Oran 1, un analyseur complet Test.l reconnaît les identificateurs, les entiers signés et les opérateurs arithmétiques, tout en filtrant les blancs et tabulations.",
              "In the Université Oran 1 lab, a complete scanner Test.l detects identifiers, signed integers, and arithmetic operators, while filtering spaces and tabs.",
              "%{\n#include <stdio.h>\n%}\n%option noyywrap\n%option yylineno\n\nlettre  [a-zA-Z]\nchiffre [0-9]\nidf     {lettre}({lettre}|{chiffre}|_)*\nentier  [+-]?{chiffre}+\n\n%%\n{idf}      { printf(\"[Ligne %d] Identificateur : %s\\n\", yylineno, yytext); }\n{entier}   { printf(\"[Ligne %d] Entier signé : %s\\n\", yylineno, yytext); }\n[+\-*/=]   { printf(\"[Ligne %d] Opérateur : %s\\n\", yylineno, yytext); }\n[ \t\n]    ; /* ignorer séparateurs */\n.          { printf(\"[Ligne %d] Caractère invalide : %s\\n\", yylineno, yytext); }\n%%\nint main() { yylex(); return 0; }",
            ),
          ],
          pitfall: "Le métacaractère point '.' correspond à n'importe quel caractère à l'exception de '\\n'. Pour capturer un point littéral, il faut l'échapper '\\.' ou le mettre entre apostrophes.",
          pitfallEn: "The dot '.' matches any character except newline '\\n'. To match a literal dot, escape it '\\.' or place it in quotes.",
          lab: "/lab/lexer",
          prerequisite: ["tp-flex-bases"],
        },
      ),
    ],
  },
  {
    id: "tp-bison",
    title: "TP Pratique · Bison & Analyse Syntaxique",
    titleEn: "Practical Lab · Bison & Syntax Analysis",
    description: "Calculatrices arithmétiques, validation de formats et mini-compilateurs impératifs.",
    descriptionEn: "Arithmetic calculators, format validators, and imperative mini-compilers.",
    lessons: [
      lesson(
        "tp-bison-calc",
        "Couplage Flex & Bison · Calculatrice",
        "Flex & Bison Pairing · Arithmetic Calculator",
        25,
        {
          outcomes: [
            "Associer Flex et Bison avec génération de l'en-tête partagé calc.tab.h.",
            "Fixer les priorités et associativités d'opérateurs avec %left et %right.",
            "Évaluer des expressions arithmétiques complexes et gérer les erreurs avec yyerror().",
          ],
          outcomesEn: [
            "Pair Flex and Bison using the shared header calc.tab.h.",
            "Declare operator precedence and associativity with %left and %right.",
            "Evaluate arithmetic expressions and handle syntax errors via yyerror().",
          ],
          vocabulary: {
            Bison: "LALR(1) parser generator compatible with Yacc",
            yylval: "global variable carrying the semantic value of a token",
            yyparse: "top-level parsing function generated by Bison",
            "%left": "declares left-associative operators with assigned precedence level",
          },
          sections: [
            section(
              "Couplage par le fichier d'en-tête calc.tab.h",
              "Pairing via header file calc.tab.h",
              "Bison génère l'analyseur syntaxique (calc.tab.c) et le fichier d'en-tête (calc.tab.h) via l'option -d. Cet en-tête définit les codes numériques des tokens (%token NB). Flex inclut calc.tab.h pour retourner ces codes entiers à yyparse() tout en assignant yylval.",
              "Bison creates the syntax parser (calc.tab.c) and header file (calc.tab.h) when run with -d. This header defines numerical token codes (%token NB). Flex includes calc.tab.h to return these token codes to yyparse() while setting yylval.",
              "Chaîne de compilation croisée :\n$ bison -d calc.y       # Produit calc.tab.c et calc.tab.h\n$ flex calc.l           # Produit lex.yy.c (inclut calc.tab.h)\n$ gcc lex.yy.c calc.tab.c -o calc.exe\n$ ./calc.exe",
            ),
            section(
              "Spécification Bison : calc.y avec priorités",
              "Bison specification: calc.y with precedence",
              "Pour éliminer l'ambiguïté des expressions arithmétiques, on déclare les priorités de la plus faible à la plus forte avec %left. Les opérateurs sur une même ligne ont la même priorité et s'évaluent de gauche à droite.",
              "To eliminate grammar ambiguity in arithmetic expressions, operator precedences are declared from lowest to highest using %left. Operators on the same line share precedence and associate left-to-right.",
              "%{\n#include <stdio.h>\n#include <stdlib.h>\nint yylex(void);\nvoid yyerror(const char *s);\n%}\n%token NB\n%left '+' '-'\n%left '*' '/'\n%left NEG\n%%\ninput: /* vide */ | input line ;\nline: '\\n' | exp '\\n' { printf(\"Résultat = %d\\n\", $1); } ;\nexp: NB          { $$ = $1; }\n   | exp '+' exp { $$ = $1 + $3; }\n   | exp '-' exp { $$ = $1 - $3; }\n   | exp '*' exp { $$ = $1 * $3; }\n   | exp '/' exp { if ($3 == 0) yyerror(\"Division par zéro !\"); else $$ = $1 / $3; }\n   | '-' exp %prec NEG { $$ = -$2; }\n   | '(' exp ')' { $$ = $2; }\n   ;\n%%\nvoid yyerror(const char *s) { fprintf(stderr, \"Erreur : %s\\n\", s); }\nint main() { return yyparse(); }",
            ),
          ],
          pitfall: "Oublier l'option -d dans 'bison -d' empêche la création de calc.tab.h, provoquant des erreurs de compilation dans le fichier Flex.",
          pitfallEn: "Forgetting the -d flag in 'bison -d' prevents generation of calc.tab.h, causing compilation failure in the Flex file.",
          lab: "/lab/lr",
          prerequisite: ["tp-flex-avance", "table-ll1"],
        },
      ),
      lesson(
        "tp-bison-langage",
        "Validation de Formats & Mini-Compilateur",
        "Format Validation & Mini-Compiler",
        25,
        {
          outcomes: [
            "Distinguer validation de format syntaxique et vérification de contrainte sémantique.",
            "Concevoir un analyseur syntaxique pour un mini-langage impératif (Pascal).",
            "Localiser précisément les erreurs de syntaxe à la ligne exacte avec yylineno.",
          ],
          outcomesEn: [
            "Distinguish syntactic structure validation from semantic constraint checking.",
            "Build a parser for an imperative mini-language (Pascal-style).",
            "Locate syntax errors to the exact line number using yylineno.",
          ],
          vocabulary: {
            "validation de date": "syntactic format checking against structured rules",
            "langage impératif": "language structured around statements, variables and blocks",
            "bloc begin..end": "compound statement construct enclosing instruction sequences",
          },
          sections: [
            section(
              "Cas d'étude 1 : Validation de format de date (date.l & date.y)",
              "Case study 1: Date format validation (date.l & date.y)",
              "Le TP de l'Université d'Oran 1 traite la validation d'une date jj/MM/AAAA. Le lexer découpe les blocs numériques et séparateurs '/'. Le parser vérifie la structure syntaxique (JOUR SEP MOIS SEP ANNEE). La sémantique vérifie les plages de validité (ex: jour entre 1 et 31, mois entre 1 et 12, et années bissextiles pour février).",
              "The Oran 1 lab validates dates formatted as DD/MM/YYYY. The lexer produces number tokens and slash separators. The parser verifies grammar structure (DAY SEP MONTH SEP YEAR). Semantic checks enforce ranges (day in 1..31, month in 1..12, leap year logic).",
              "/* date.y */\n%token ENTIER SEP\n%%\ndate: ENTIER SEP ENTIER SEP ENTIER {\n    int j = $1, m = $3, a = $5;\n    if (m < 1 || m > 12 || j < 1 || j > 31)\n        printf(\"Date sémantiquement invalide !\\n\");\n    else\n        printf(\"Date valide : %02d/%02d/%04d\\n\", j, m, a);\n};",
            ),
            section(
              "Cas d'étude 2 : Mini-compilateur de langage impératif (exo2.l & exo2.y)",
              "Case study 2: Imperative mini-compiler (exo2.l & exo2.y)",
              "L'exercice 2 du TP d'Oran 1 implémente un compilateur complet pour un langage à structure Pascal : en-tête 'program id', section de déclaration 'var id : type ;', et bloc d'instructions 'begin ... end.'.",
              "Exercise 2 of the Oran 1 lab implements a complete parser for Pascal-like code: program header, var declaration section, and begin..end instruction block.",
              "/* exo2.y */\n%token PROGRAM VAR BEGIN_TOK END_TOK INTEGER REAL IDENT CST\n%%\npgm: PROGRAM IDENT VAR decls BEGIN_TOK insts END_TOK '.' { printf(\"Programme valide !\\n\"); } ;\ndecls: /* vide */ | decls decl ;\ndecl: IDENT ':' type ';' ;\ntype: INTEGER | REAL ;\ninsts: /* vide */ | insts inst ;\ninst: IDENT ':=' exp ';' ;\nexp: IDENT | CST | exp '+' exp ;",
            ),
          ],
          pitfall: "Une date comme 31/02/2024 est syntaxiquement valide (trois entiers séparés par des slashes) mais sémantiquement fausse. Ne pas rejeter au niveau du lexer ce qui relève de la sémantique.",
          pitfallEn: "A date like 31/02/2024 is syntactically valid (numbers and slashes) but semantically invalid. Do not attempt semantic rejection inside the lexer.",
          lab: "/lab/grammar",
          prerequisite: ["tp-bison-calc"],
        },
      ),
    ],
  },
  {
    id: "td-oran",
    title: "Fiches TD Oran 1 · Résolutions & Méthodes",
    titleEn: "Oran 1 Tutorial Sheets · Solutions & Methods",
    description: "Automates finis, analyse descendante récursive, organigrammes et tables LL(1).",
    descriptionEn: "Finite automata, recursive descent parsing, flowcharts, and LL(1) tables.",
    lessons: [
      lesson(
        "oran-td1-analyse",
        "Fiche TD 1 · De l'Automate aux Unités Lexicales",
        "Worksheet TD 1 · From Automata to Lexical Tokens",
        20,
        {
          outcomes: [
            "Concevoir l'automate fini pour les nombres binaires ayant au moins deux zéros.",
            "Classifier sans ambiguïté les erreurs d'un code source (lexicale, syntaxique, sémantique).",
            "Dresser la table des lexèmes et produire la suite des couples (Token, Attribut).",
          ],
          outcomesEn: [
            "Design the finite automaton for binary numbers containing at least two zeros.",
            "Unambiguously classify source code errors (lexical, syntactic, semantic).",
            "Build the lexeme table and output the stream of token pairs (Token, Attribute).",
          ],
          vocabulary: {
            "automate fini": "formal quintuple A = (Σ, E, e0, δ, F) modeling token recognition",
            "erreur lexicale": "illegal character not present in the alphabet Σ",
            "erreur syntaxique": "token appearing in a grammatically invalid position",
            "erreur sémantique": "type mismatch or undeclared variable",
          },
          sections: [
            section(
              "Exercice 1 : Automate fini des nombres binaires",
              "Exercise 1: Finite automaton for binary numbers",
              "Dans la Fiche TD 1 d'Oran 1, on recherche l'expression régulière et l'automate reconnaissant les nombres binaires formés d'au moins deux zéros. L'expression régulière minimale est 1* 0 1* 0 (0+1)*. L'automate possède trois états : e0 (aucun zéro vu), e1 (exactement un zéro vu), et e3 (état acceptant ayant vu au moins deux zéros).",
              "In Worksheet TD 1 from Oran 1, we construct the regular expression and automaton for binary numbers containing at least two zeros. The minimal regex is 1* 0 1* 0 (0+1)*. The DFA uses three states: e0 (0 zeros seen), e1 (1 zero seen), and e3 (accepting state with >=2 zeros seen).",
              "Automate A = ({0, 1}, {e0, e1, e3}, e0, δ, {e3})\nTransitions δ :\n  δ(e0, 1) = e0,  δ(e0, 0) = e1\n  δ(e1, 1) = e1,  δ(e1, 0) = e3\n  δ(e3, 0) = e3,  δ(e3, 1) = e3\nMots acceptés : 00, 1001, 01001, 110101",
            ),
            section(
              "Exercice 2 : Classification rigoureuse des erreurs",
              "Exercise 2: Rigorous error classification",
              "Un programme mini-Pascal est analysé selon la grammaire P -> program ident Dec begin Inst end. Quatre erreurs doivent être localisées et catégorisées avec justification formelle.",
              "A mini-Pascal source is inspected against grammar P -> program ident Dec begin Inst end. Four errors are located and categorized with theoretical rationale.",
              "Programme analysé :\nProgram main\n  var x, y : real ;\n      a, b : integer ;\nbegin\n  b := b + x ;   /* Sémantique : affectation d'un réel à un entier */\n  x := b + ;     /* Syntaxique : opérande manquant après '+' */\n  c := b ;       /* Sémantique : variable 'c' non déclarée */\nend.",
            ),
          ],
          pitfall: "Ne pas confondre 'variable non déclarée' (erreur sémantique) avec un 'identificateur non reconnu' (qui serait lexical uniquement si la forme de l'identificateur viole l'alphabet).",
          pitfallEn: "Do not confuse 'undeclared variable' (semantic error) with an illegal identifier (which is lexical only if it contains illegal characters).",
          lab: "/lab/automata",
          prerequisite: ["pipeline", "fiche-1"],
        },
      ),
      lesson(
        "oran-td2-descendante",
        "Fiche TD 2 · Analyse Descendante Récursive",
        "Worksheet TD 2 · Recursive Descent Parsing",
        25,
        {
          outcomes: [
            "Traduire chaque non-terminal en procédure récursive et schéma bloc (organigramme).",
            "Simuler la pile d'appels récursifs sur des mots acceptés et rejetés.",
            "Reconstruire l'arbre syntaxique et déterminer la suite des règles de l'analyse gauche.",
          ],
          outcomesEn: [
            "Translate each nonterminal into a recursive function and flowchart.",
            "Simulate the recursive call stack on accepted and rejected strings.",
            "Reconstruct parse trees and determine the leftmost derivation rule sequence.",
          ],
          vocabulary: {
            "$SY": "current input symbol being inspected",
            Avance: "primitive consuming $SY and reading next terminal",
            Ret: "procedure return indicating successful parse of sub-tree",
            "analyse gauche": "sequence of production numbers applied in leftmost derivation",
          },
          sections: [
            section(
              "Méthode des procédures récursives et schémas blocs",
              "Recursive procedures method and flowcharts",
              "Dans l'analyse descendante récursive (Fiche TD 2 d'Oran 1), à chaque non-terminal correspond une procédure. Une variable globale $SY inspecte le symbole courant. Si $SY correspond au symbole attendu, on appelle 'Avance'. Lors d'un choix, on teste $SY pour aiguiller vers l'alternative appropriée.",
              "In recursive descent parsing (Oran 1 TD 2), each nonterminal maps to a procedure. A global variable $SY inspects the lookahead symbol. When matching an expected terminal, 'Avance' consumes it. Decision diamonds inspect $SY to branch into the correct production.",
              "/* Procédure type */\nvoid S() {\n    if ($SY == 'a') {\n        Avance();\n        if ($SY == 'b') { Avance(); A(); return; }\n        return; /* Règle S -> a */\n    } else if ($SY == 'b') {\n        Avance(); S(); return; /* Règle S -> bS */\n    }\n    Erreur(\"Symbole inattendu dans S\");\n}",
            ),
            section(
              "Exercice 3 : Dérivation et sortie d'analyse gauche",
              "Exercise 3: Derivation and leftmost output sequence",
              "Pour la grammaire E -> A := B (r1), B -> A + B (r2), B -> id (r3), A -> id (r4), l'analyse gauche pour la chaîne w = id := id + id + id + id produit la suite exacte des règles appliquées.",
              "For grammar E -> A := B (r1), B -> A + B (r2), B -> id (r3), A -> id (r4), leftmost derivation for string w = id := id + id + id + id outputs the exact sequence of applied productions.",
              "Dérivation gauche étape par étape :\nE ⇒ A := B                          (r1)\n  ⇒ id := B                         (r4)\n  ⇒ id := A + B                     (r2)\n  ⇒ id := id + B                    (r4)\n  ⇒ id := id + A + B                (r2)\n  ⇒ id := id + id + B               (r4)\n  ⇒ id := id + id + A + B           (r2)\n  ⇒ id := id + id + id + B          (r4)\n  ⇒ id := id + id + id + id         (r3)\n\nSuite d'analyse gauche A.G = 1, 4, 2, 4, 2, 4, 2, 4, 3",
            ),
          ],
          pitfall: "Une grammaire avec récursivité gauche (A -> A α) fait boucler indéfiniment un analyseur descendant récursif (débordement de pile d'appels).",
          pitfallEn: "Left-recursive grammars (A -> A α) cause infinite recursion and call stack overflow in recursive descent parsers.",
          lab: "/lab/grammar",
          prerequisite: ["derivations", "factorisation"],
        },
      ),
      lesson(
        "oran-td3-ll1-table",
        "Fiche TD 3 · Table LL(1) & Méthode d'Extraction",
        "Worksheet TD 3 · LL(1) Table & Extraction Method",
        25,
        {
          outcomes: [
            "Extraire les règles de départ et calculer les ensembles PREMIER et SUIVANT.",
            "Construire la table d'analyse prédictive LL(1) avec lignes de terminaux EXT et $ ACC.",
            "Démontrer la propriété LL(1) par l'absence stricte de conflits.",
            "Simuler la pile d'analyse prédictive sur l'entrée 'cded'.",
          ],
          outcomesEn: [
            "Extract rule starts and compute FIRST and FOLLOW sets.",
            "Construct the predictive LL(1) table including terminal EXT rows and $ ACC.",
            "Prove LL(1) conformance by verifying absence of multiple definitions.",
            "Simulate predictive stack parsing on input 'cded'.",
          ],
          vocabulary: {
            "règle d'extraction": "deriving terminal lookaheads from production bodies",
            EXT: "table action extracting matching terminal from input",
            ACC: "table action accepting string when stack and input reach $",
            "conflit LL(1)": "cell in table M[A, a] containing more than one production",
          },
          sections: [
            section(
              "Méthode d'extraction des règles (TD 3, Exercice 1)",
              "Rule extraction method (TD 3, Exercise 1)",
              "Soit la grammaire : S -> Tac | Ued, T -> bTd | λ, U -> cUd | λ. On extrait les terminaux débutant chaque alternative : S -> Tac commence par 'b' ou 'a' ; S -> Ued commence par 'c' ou 'e'. Pour les règles nullables, on inspecte ce qui suit : T est suivi de 'a' et 'd' ; U est suivi de 'e' et 'd'.",
              "Given grammar: S -> Tac | Ued, T -> bTd | λ, U -> cUd | λ. We extract lookaheads starting each rule: S -> Tac starts with 'b' or 'a'; S -> Ued starts with 'c' or 'e'. For nullable rules, we inspect followers: T is followed by 'a' and 'd'; U is followed by 'e' and 'd'.",
              "Règles et placement dans la table :\n• S -> Tac (r1)  placé dans M[S, a] et M[S, b]\n• S -> Ued (r2)  placé dans M[S, c] et M[S, e]\n• T -> bTd (r3)  placé dans M[T, b]\n• T -> λ   (r4)  placé dans M[T, a] et M[T, d]  (car FOLLOW(T)={a, d})\n• U -> cUd (r5)  placé dans M[U, c]\n• U -> λ   (r6)  placé dans M[U, d] et M[U, e]  (car FOLLOW(U)={d, e})",
            ),
            section(
              "Simulation de la pile LL(1) sur le mot cded",
              "Predictive LL(1) stack simulation for cded",
              "On initialise la pile avec $ S et l'entrée avec c d e d $. Le symbole de tête de pile guide la consultation de la table prédictive M.",
              "Initialize stack with $ S and input buffer with c d e d $. Top of stack dictates predictive table M lookup.",
              "Pile            Entrée          Action\n$ S             c d e d $       S -> U e d (r2)\n$ d e U         c d e d $       U -> c U d (r5)\n$ d e d U c     c d e d $       Match 'c'\n$ d e d U       d e d $         U -> λ (r6)\n$ d e d         d e d $         Match 'd'\n$ d e           e d $           Match 'e'\n$ d             d $             Match 'd'\n$               $               ACC (Mot accepté !)",
            ),
          ],
          pitfall: "Pour une règle A -> λ, ne jamais placer la règle sur les terminaux de FIRST(A). On la place UNIQUEMENT dans les colonnes b ∈ FOLLOW(A).",
          pitfallEn: "For an epsilon rule A -> λ, never place it under FIRST(A). Place it ONLY under columns b ∈ FOLLOW(A).",
          lab: "/lab/ll1",
          prerequisite: ["first-follow", "table-ll1"],
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
      lesson(
        "oran-slr-pas-a-pas",
        "Construction SLR(1) Pas à Pas · S → SaSb",
        "Step-by-Step SLR(1) Construction · S → SaSb",
        25,
        {
          outcomes: [
            "Calculer FOLLOW(S) par point fixe sur la grammaire récursive S -> SaSb | λ.",
            "Construire la collection canonique LR(0) complète des 5 états I0 à I4.",
            "Remplir la table d'analyse SLR(1) et prouver l'absence de conflit.",
          ],
          outcomesEn: [
            "Compute FOLLOW(S) to fixed point on recursive grammar S -> SaSb | λ.",
            "Construct the full LR(0) collection of 5 states I0 to I4.",
            "Fill the SLR(1) parsing table and prove absence of conflicts.",
          ],
          vocabulary: {
            "FOLLOW(S)": "terminals that can immediately follow nonterminal S: {a, b, $}",
            "collection canonique LR(0)": "set of item sets closed under CLOSURE and GOTO",
            "absence de conflit": "every table cell has at most one parsing action",
          },
          sections: [
            section(
              "Calcul de FOLLOW(S) = {a, b, $}",
              "Computation of FOLLOW(S) = {a, b, $}",
              "Pour la grammaire S -> SaSb | λ, S est l'axiome donc $ ∈ FOLLOW(S). Dans la production S -> SaSb, la première occurrence de S est suivie de 'a', donc a ∈ FOLLOW(S). La deuxième occurrence de S est suivie de 'b', donc b ∈ FOLLOW(S). Par fermeture, FOLLOW(S) = {a, b, $}.",
              "For grammar S -> SaSb | λ, S is the start symbol so $ ∈ FOLLOW(S). In S -> SaSb, the first S occurrence is followed by 'a', adding 'a'. The second S occurrence is followed by 'b', adding 'b'. Thus FOLLOW(S) = {a, b, $}.",
              "Ensembles :\nFIRST(S) = {a, λ}\nFOLLOW(S) = {a, b, $}\n\nRègle de réduction SLR :\nPour l'item terminé S -> λ ·, on réduit r2 sur TOUT terminal de FOLLOW(S) = {a, b, $}.",
            ),
            section(
              "Les 5 états de l'automate LR(0)",
              "The 5 states of the LR(0) automaton",
              "On augmente la grammaire avec S' -> S. La collection canonique comprend 5 états sans ambiguïté : I0, I1, I2, I3, I4.",
              "We augment grammar with S' -> S. The canonical collection yields 5 unambiguous states: I0, I1, I2, I3, I4.",
              "I0 = CLOSURE(S' -> ·S) = { [S' -> ·S], [S -> ·SaSb], [S -> ·] }\nI1 = GOTO(I0, S) = { [S' -> S·], [S -> S·aSb] }\nI2 = GOTO(I1, a) = { [S -> Sa·Sb], [S -> ·SaSb], [S -> ·] }\nI3 = GOTO(I2, S) = { [S -> SaS·b], [S -> S·aSb] }\nI4 = GOTO(I3, b) = { [S -> SaSb·] }",
            ),
          ],
          pitfall: "Une réduction LR(0) brute placerait la réduction sur tous les symboles, créant un conflit dans I1 avec le décalage sur 'a'. C'est le filtrage par FOLLOW(S) qui rend la table SLR(1) déterministe.",
          pitfallEn: "A raw LR(0) reduction would place reductions on all terminals, causing a conflict in I1 with shift on 'a'. SLR's filtering by FOLLOW(S) keeps the table deterministic.",
          lab: "/lab/lr",
          grammar: "S -> S a S b | ε",
          prerequisite: ["slr"],
        },
      ),
      lesson(
        "oran-lr-simulation-pile",
        "Simulation LR sur la Pile · Tableau de Chaîne",
        "LR Stack Simulation · Input Processing Table",
        25,
        {
          outcomes: [
            "Maîtriser les mouvements de la pile LR alternant états et symboles.",
            "Dépiler 2k éléments lors d'une réduction par une règle de membre droit de longueur k.",
            "Dresser le tableau complet à 3 colonnes (Pile, Chaîne, Sortie) jusqu'à l'acceptation.",
          ],
          outcomesEn: [
            "Master LR stack dynamics alternating states and grammar symbols.",
            "Pop 2k items on a reduction by a production of right-hand side length k.",
            "Build the complete 3-column table (Stack, Input Buffer, Output) until acceptance.",
          ],
          vocabulary: {
            "tableau de chaîne": "step-by-step trace of bottom-up parsing execution",
            "décalage dk": "pushing lookahead terminal and target state k onto the stack",
            "réduction ri": "replacing right-hand side symbols by nonterminal and consulting GOTO",
            "acceptation ACC": "terminating state 1 on input $ reaching valid grammar recognition",
          },
          sections: [
            section(
              "Principe du tableau de pile à trois colonnes",
              "Principle of the 3-column stack table",
              "Comme enseigné en cours et TD à l'Université d'Oran 1, la simulation LR se structure en trois colonnes : Pile, Chaîne restante, et Sortie. La pile contient la suite alternée des états et symboles reconnus. Lors d'un décalage, le terminal et l'état cible sont empilés. Lors d'une réduction A -> α, on retire 2*|α| éléments, le sommet devient un état s, puis on empile A et l'état GOTO(s, A).",
              "As taught in lectures at Université Oran 1, LR parsing trace uses three columns: Stack, Remaining Input, and Output. The stack alternates states and grammar symbols. On shift, terminal and target state are pushed. On reduce A -> α, 2*|α| items are popped, leaving state s at top, then A and state GOTO(s, A) are pushed.",
              "Exemple de transition :\nPile : 0 a 3 b 4   Chaîne : aab$   Sortie : λ\nAction table(4, a) = r3 (B -> b)\nPop de 2 éléments (b 4) -> Sommet = 3\nGOTO(3, B) = 6\nNouvelle pile : 0 a 3 B 6   Chaîne : aab$   Sortie : 3",
            ),
            section(
              "Théorème de hiérarchie SLR ⊆ LALR ⊆ LR",
              "Hierarchy theorem SLR ⊆ LALR ⊆ LR",
              "Dans la fiche de TD d'Oran 1 (photo 30), il est rappelé la chaîne d'implications fondamentales : si une grammaire est SLR(1), alors elle est obligatoirement LALR(1), et par conséquent elle est obligatoirement LR(1).",
              "Worksheet TD notes from Oran 1 emphasize the core hierarchy: if a grammar is SLR(1), it is necessarily LALR(1), and consequently necessarily LR(1).",
              "Implications universelles :\nG ∈ SLR(1) ⟹ G ∈ LALR(1) ⟹ G ∈ LR(1)\nG ∉ LR(1)  ⟹ G ∉ LALR(1) ⟹ G ∉ SLR(1)",
            ),
          ],
          pitfall: "Ne jamais oublier de dépiler deux fois plus d'éléments que la longueur du membre droit (un état et un symbole par élément du membre droit). Pour une règle A -> λ, on ne dépile rien (0 élément).",
          pitfallEn: "Always pop twice as many stack elements as the RHS length (one state and one symbol per RHS element). For A -> λ, pop 0 elements.",
          lab: "/lab/lr",
          grammar: "S -> B B\nB -> a B | b",
          prerequisite: ["oran-slr-pas-a-pas"],
        },
      ),
      lesson(
        "oran-lr1-lalr-conflit",
        "Démonstration du Conflit LALR(1) · Fusion de Cœurs",
        "LALR(1) Conflict Proof · Core Merging",
        30,
        {
          outcomes: [
            "Construire la collection canonique LR(1) complète à 14 états.",
            "Prouver formellement qu'une grammaire est LR(1) sans conflit.",
            "Démontrer l'apparition du conflit Réduction / Réduction lors de la fusion LALR.",
          ],
          outcomesEn: [
            "Construct the full 14-state canonical LR(1) collection.",
            "Formally prove that a grammar is LR(1) without conflicts.",
            "Demonstrate the emergence of a Reduce/Reduce conflict upon LALR core merging.",
          ],
          vocabulary: {
            "noyau LR(0) (core)": "set of LR items ignoring lookahead components",
            "fusion LALR": "union of item lookaheads for states having identical LR(0) cores",
            "conflit Reduce/Reduce": "two distinct reductions competing in the same table cell",
          },
          sections: [
            section(
              "Grammaire de référence et collection LR(1)",
              "Reference grammar and LR(1) collection",
              "La grammaire classique étudiée en TD à Oran 1 est : S -> a A d | b B d | a B e | b A e, A -> c, B -> c. Sa collection LR(1) compte exactement 14 états distincts I0 à I13.",
              "The classic grammar studied in Oran 1 tutorials is: S -> a A d | b B d | a B e | b A e, A -> c, B -> c. Its LR(1) collection contains exactly 14 distinct states I0 to I13.",
              "Productions numérotées :\n1: S -> a A d\n2: S -> b B d\n3: S -> a B e\n4: S -> b A e\n5: A -> c\n6: B -> c\n\nÉtats clés :\nI6 = { [A -> c·, d], [B -> c·, e] }\nI9 = { [B -> c·, d], [A -> c·, e] }",
            ),
            section(
              "La fusion des cœurs crée un conflit Reduce/Reduce",
              "Core merging creates a Reduce/Reduce conflict",
              "Les états I6 et I9 ont exactement le même noyau LR(0) { A -> c·, B -> c· }. En les fusionnant en un état LALR J6 = I6 ∪ I9, les lookaheads sont fusionnés : A -> c a pour lookaheads {d, e}, et B -> c a aussi pour lookaheads {d, e}. Sur la colonne 'd' ou 'e', la table LALR contient à la fois r5 et r6, créant un conflit irréversible !",
              "States I6 and I9 share the identical LR(0) core { A -> c·, B -> c· }. Merging them into LALR state J6 = I6 ∪ I9 unions their lookaheads: A -> c has lookahead {d, e}, and B -> c also has {d, e}. Under columns 'd' and 'e', the LALR table contains both r5 and r6, creating an unavoidable Reduce/Reduce conflict!",
              "État fusionné J6 :\n[A -> c·, d/e]   (r5)\n[B -> c·, d/e]   (r6)\n\nTable LALR à la ligne J6 :\nColonne 'd' : { r5, r6 } -> Conflit Reduce / Reduce\nColonne 'e' : { r5, r6 } -> Conflit Reduce / Reduce\n\nConclusion formelle : G est LR(1) mais n'est pas LALR(1).",
            ),
          ],
          pitfall: "La fusion LALR ne crée JAMAIS de conflit Shift/Reduce sur une grammaire LR(1), mais peut créer des conflits Reduce/Reduce lorsque deux règles ont des cœurs identiques.",
          pitfallEn: "LALR merging NEVER introduces Shift/Reduce conflicts on an LR(1) grammar, but can introduce Reduce/Reduce conflicts when multiple rules share identical cores.",
          lab: "/lab/lr",
          grammar: LR_COUNTER,
          prerequisite: ["lr1-lalr"],
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
      lesson(
        "oran-examen-2025",
        "Examen 2024/2025 Oran 1 · Résolu Pas à Pas",
        "Exam 2024/2025 Oran 1 · Step-by-Step Solution",
        30,
        {
          outcomes: [
            "Calculer les items LR(1) I0, I1, I2, I3 sur la grammaire E -> E+E | E*E | id.",
            "Identifier formellement le conflit Shift/Reduce dans l'état 3 sur le terminal '+'.",
            "Résoudre les conflits grâce aux directives de priorité (%left '+' et %left '*').",
            "Maîtriser les théorèmes d'implication entre familles LL(1), SLR(1), LALR(1) et LR(1).",
          ],
          outcomesEn: [
            "Compute LR(1) items I0, I1, I2, I3 on grammar E -> E+E | E*E | id.",
            "Formally detect the Shift/Reduce conflict in state 3 on lookahead '+'.",
            "Resolve conflicts using operator precedence (%left '+' and %left '*').",
            "Apply implication theorems across LL(1), SLR(1), LALR(1), and LR(1) grammar families.",
          ],
          vocabulary: {
            "grammaire ambiguë": "grammar generating multiple distinct parse trees for a single string",
            "conflit Shift/Reduce": "competition between shifting the next token or reducing with a production",
            "associativité gauche": "resolving operator ties by favoring immediate reduction",
            "implication LL(1) => LR(1)": "every LL(1) grammar is LR(1); non-LR(1) implies non-LL(1)",
          },
          sections: [
            section(
              "Exercice 1 : Calcul des items LR(1) I0 à I3 et détection de conflit",
              "Exercise 1: Computation of LR(1) items I0 to I3 and conflict detection",
              "Pour la grammaire E -> E+E | E*E | id, on calcule les fermetures avec lookaheads. Dans l'état I3 = Tr(Tr(I1, +), E), on observe l'item terminé [E -> E+E·, $/+/\*] et les items [E -> E·+E, $/+/\*] et [E -> E·*E, $/+/\*]. Sur le terminal '+', l'analyseur hésite entre décaler et réduire : c'est un conflit Décalage/Réduction.",
              "For grammar E -> E+E | E*E | id, we compute closures with lookaheads. In state I3 = Tr(Tr(I1, +), E), completed item [E -> E+E·, $/+/\*] competes with [E -> E·+E, $/+/\*] and [E -> E·*E, $/+/\*]. On lookahead '+', the parser hesitates between shift and reduce: this is a Shift/Reduce conflict.",
              "Détail de l'état 3 :\nI3 = {\n  [E -> E + E ·,  $ / + / *],   /* Règle r1 : Réduction */\n  [E -> E · + E,  $ / + / *],   /* Décalage sur '+' */\n  [E -> E · * E,  $ / + / *]    /* Décalage sur '*' */\n}\nAction(3, +) = { décalage d, réduction r1 } -> CONFLIT Décalage / Réduction !\nConclusion : La grammaire n'est pas LR(1).",
            ),
            section(
              "Exercice 2 : Résolution par priorités et associativités",
              "Exercise 2: Resolution via precedence and associativity",
              "En déclarant que '*' est strictement plus prioritaire que '+', et que '+' est associatif à gauche, le conflit est levé sans modifier la grammaire : sur '+', on réduit r1 ; sur '*', on décale. La grammaire désambiguïsée devient analysable en LR(1), LALR(1) et SLR(1).",
              "By declaring '*' with higher precedence than '+', and '+' left-associative, the conflict is resolved without rewriting the grammar: on '+', we reduce r1; on '*', we shift. The disambiguated grammar becomes parsable in LR(1), LALR(1), and SLR(1).",
              "Règles d'arbitrage dans I3 :\n• Sur '+' : comme '+' est associatif à gauche (le '+' de gauche est prioritaire), on choisit la RÉDUCTION r1.\n• Sur '*' : comme '*' est plus prioritaire que '+', on choisit le DÉCALAGE d.\n• Sur '$' : on choisit la RÉDUCTION r1.\nTable d'analyse : Conflits éliminés !",
            ),
          ],
          pitfall: "Toute grammaire LL(1) est LR(1). Ainsi, prouver qu'une grammaire n'est pas LR(1) permet d'affirmer immédiatement qu'elle n'est pas LL(1) (contraposée). En revanche, la réciproque est fausse : une grammaire LR(1) n'est pas forcément LL(1).",
          pitfallEn: "Every LL(1) grammar is LR(1). Proving a grammar is not LR(1) immediately proves it is not LL(1) by contrapositive. However, the converse is false: an LR(1) grammar is not necessarily LL(1).",
          lab: "/exams",
          grammar: "E -> E + E | E * E | id",
          prerequisite: ["oran-lr1-lalr-conflit", "methode-examen"],
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
