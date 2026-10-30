# Conceito e fases

## A ideia

Um terrário no PC com criaturas vivas. Cada uma tem um agente de IA. Você dá um tema ou solta um link, ela sai para caçar, lê as páginas e volta com um resumo em markdown, que vira conhecimento do Brain.

## Regras

- **Privacidade**: a criatura só lê o que recebe (tema, link, página indicada). Nunca a tela, nunca arquivos, nunca o que o usuário digita em outros programas.
- **Nada de segredo no repositório**: chave da IA só por variável de ambiente.
- **Local**: o servidor só escuta em `127.0.0.1`.

## Fases

| Fase | O quê | Estado |
|---|---|---|
| 1. Protótipo web | terrário animado, caçada de tema ou link, markdown gravado | **feito (0.1.0)** |
| 2. App de desktop | empacotar em Electron (como o Qward Bifrost) ou Tauri; ícone na bandeja; criaturas em janela própria | a fazer |
| 3. Wallpaper generativo | a cada bloqueio do Windows, gerar uma imagem nova e única (padrões infinitos a partir das criaturas e do que elas leram) | conceito abaixo |
| 4. Celular | versão para o telefone | depois |

## Wallpaper generativo (fase 3)

- **Semente** = data e hora do bloqueio + temas caçados no dia. A mesma semente gera a mesma imagem; uma nova semente, uma imagem nunca vista.
- **Desenho**: o mesmo motor do terrário em modo "pintura". Campo de fluxo (ruído) guia rastros das criaturas por alguns milhares de passos sobre o fundo; os termos aprendidos viram constelações. Exporta PNG na resolução da tela.
- **No Windows**: uma tarefa agendada no evento de bloqueio (ou ao desbloquear, para preparar o próximo) roda o gerador e troca a imagem da tela de bloqueio. A forma exata de trocar a tela de bloqueio depende da edição do Windows; precisa ser testada na máquina real antes de entregar.
- Sem instalar nada além do próprio app.

## Por que centopeia de blocos

Cada bloco é um estado (4 células que piscam), as pernas são arestas de um grafo e os pés são nós. Quando ela lê, os blocos piscam mais rápido, as palavras lidas acendem e os termos saem flutuando como num cladograma.
