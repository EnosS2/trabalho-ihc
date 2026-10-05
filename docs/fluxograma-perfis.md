# Fluxogramas do sistema por perfil de usuário

Um fluxograma para cada perfil de acesso do sistema de gestão da testagem rápida, do login às tarefas
principais. Os diagramas estão em [Mermaid](https://mermaid.js.org/) (o GitHub desenha direto nesta página);
as imagens em PNG ficam em [`docs/fluxogramas/`](fluxogramas/), em versão vertical e horizontal
(`*-horizontal.png`, em formato paisagem, boa para slides).

| Nível | Perfil | Quem usa | Escopo |
|---|---|---|---|
| 1 | Agente comunitário de saúde (ACS) | Agente da equipe de saúde da família | Própria microárea |
| 2 | Executor(a) de teste rápido | Enfermeiro(a) ou técnico(a) que faz o teste | Própria UBS |
| 3 | Responsável técnico(a) | Enfermeiro(a) responsável pela UBS | Própria UBS, com gestão |
| 4 | Gestão APS / Vigilância | Gestão da atenção primária e DVS | Toda a rede, dados agregados |
| 5 | Administração do sistema | Suporte de TI | Sistema, sem dados clínicos |

Todos entram pelo mesmo login, com e-mail institucional e senha ou com a conta gov.br. O painel e o menu
que aparecem depois dependem do perfil.

---

## 1. ACS: agente comunitário de saúde

Vê só as pessoas da sua microárea com busca ativa pendente. Por sigilo, o diagnóstico não aparece:
a tarefa diz apenas o que a pessoa precisa fazer na UBS.

```mermaid
flowchart TD
  inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
  login --> ok{"Autenticado?"}
  ok -- "Não" --> erro["Mensagem de erro"] --> login
  ok -- "Sim" --> painel["Painel do ACS<br/>pendências da microárea"]
  painel --> lista["Busca ativa<br/>pessoas com prazo vencido na UBS"]
  lista --> escolher["Escolher a pessoa<br/>o que precisa fazer, endereço, telefone"]
  escolher --> contato["Visitar, ligar ou mandar mensagem"]
  contato --> registrar["Registrar a tentativa"]
  registrar --> resultado{"Conseguiu<br/>falar com a pessoa?"}
  resultado -- "Não: não encontrada,<br/>endereço errado ou recusou" --> depois["Nova tentativa depois"] --> contato
  resultado -- "Sim: orientou<br/>ou agendou" --> volta["Pessoa volta à UBS"]
  volta --> fim(["UBS registra o atendimento<br/>e a tarefa sai da lista"])

  classDef perfil fill:#e8f4ec,stroke:#16a07a,color:#0b3d2e
  class inicio,painel,fim perfil
```

---

## 2. Executor(a) de teste rápido

Registra a testagem guiada pelo fluxograma clínico e acompanha os casos reagentes até a confirmação,
o tratamento e o encerramento.

```mermaid
flowchart TD
  inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
  login --> ok{"Autenticado?"}
  ok -- "Não" --> erro["Mensagem de erro"] --> login
  ok -- "Sim" --> painel["Painel da UBS<br/>pendências do dia e alertas"]
  painel --> tarefa{"O que fazer?"}

  tarefa -- "Atender uma pessoa" --> p1["1. Pessoa<br/>buscar por nome, CNS ou CPF<br/>ou cadastrar se for nova"]
  p1 --> p2["2. Contexto<br/>motivo, gestação, exposição recente"]
  p2 --> p3["3. Testes guiados pelo fluxograma<br/>HIV, sífilis, hepatites B e C<br/>HIV: TR1 reagente pede TR2"]
  p3 --> p4["4. Conduta<br/>interpretação e orientação"]
  p4 --> reagente{"Algum<br/>reagente?"}
  reagente -- "Não" --> fimNeg(["Testagem registrada"])
  reagente -- "Sim" --> caso["Caso aberto no seguimento"]

  tarefa -- "Acompanhar casos" --> caso
  caso --> coleta["Registrar coleta do<br/>exame confirmatório"]
  coleta --> res{"Resultado do<br/>confirmatório"}
  res -- "Descartado" --> encerrado(["Caso encerrado"])
  res -- "Confirmado" --> trat["Tratamento<br/>sífilis: doses na UBS, VDRL de controle<br/>e tratamento das parcerias"]
  trat --> encerrado

  caso -. "prazo vencido" .-> busca["Busca ativa pelo ACS"]
  res -. "caso notificável" .-> notif["Notificação enviada<br/>pela responsável técnica"]

  classDef perfil fill:#e6f0f8,stroke:#1d5b7c,color:#102a3a
  classDef outro fill:#fff,stroke:#9aa5ab,stroke-dasharray:4 3,color:#333
  class inicio,painel,fimNeg,encerrado perfil
  class busca,notif outro
```

---

## 3. Responsável técnico(a) da UBS

Faz tudo o que o executor faz e, além disso, gerencia o estoque, valida e envia as notificações,
acompanha os indicadores da UBS e consulta a auditoria.

```mermaid
flowchart TD
  inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
  login --> ok{"Autenticado?"}
  ok -- "Não" --> erro["Mensagem de erro"] --> login
  ok -- "Sim" --> painel["Painel da UBS<br/>pendências, estoque e notificações"]
  painel --> tarefa{"O que fazer?"}

  tarefa -- "Atendimento" --> atend["Testagem e seguimento<br/>como o executor"]
  tarefa -- "Busca ativa" --> busca["Registrar tentativas<br/>de contato"]

  tarefa -- "Estoque" --> alerta{"Lote vencendo ou<br/>abaixo do mínimo?"}
  alerta -- "Sim" --> repor["Usar primeiro o que vence antes<br/>e pedir reposição"]
  alerta -- "Não" --> lotes
  repor --> lotes["Entrada de lotes e baixas<br/>perda, vencimento, ajuste"]
  lotes --> sislog(["Fechamento mensal<br/>exportar para o SISLOGLAB"])

  tarefa -- "Notificações" --> fila["Fila de notificações<br/>com prazo de cada uma"]
  fila --> ficha{"Ficha completa?"}
  ficha -- "Não" --> completar["Completar os dados<br/>escolaridade, raça/cor..."] --> ficha
  ficha -- "Sim" --> envio(["Enviar ao Sentinela<br/>ou à DVS"])

  tarefa -- "Indicadores" --> ind(["Positividade e cascata do cuidado<br/>da UBS"])
  tarefa -- "Auditoria" --> aud(["Quem fez o quê e quando"])

  classDef perfil fill:#ede7f6,stroke:#6a4c9c,color:#2a1d40
  class inicio,painel,sislog,envio,ind,aud perfil
```

---

## 4. Gestão APS / Vigilância

Consulta indicadores agregados por UBS e por coordenadoria de saúde. Não acessa dados identificados.

```mermaid
flowchart TD
  inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
  login --> ok{"Autenticado?"}
  ok -- "Não" --> erro["Mensagem de erro"] --> login
  ok -- "Sim" --> painel["Painel da gestão<br/>tratamento iniciado por coordenadoria"]
  painel --> ind["Indicadores"]
  ind --> filtro["Filtrar período, coordenadoria e UBS"]
  filtro --> posit["Positividade por agravo"]
  filtro --> cascata["Cascata do cuidado<br/>teste, confirmação, tratamento, notificação"]
  filtro --> comparar["Comparação entre UBS<br/>e coordenadorias"]
  posit & cascata & comparar --> abaixo{"Alguma UBS abaixo<br/>da meta de 80%?"}
  abaixo -- "Sim" --> acao(["Planejar apoio à UBS<br/>testagem ou seguimento"])
  abaixo -- "Não" --> acompanhar(["Seguir acompanhando"])

  classDef perfil fill:#fdf1e3,stroke:#d9691a,color:#4a2408
  class inicio,painel,acao,acompanhar perfil
```

---

## 5. Administração do sistema

Gerencia usuários, unidades e parâmetros, e consulta a auditoria. Não acessa dados clínicos.

```mermaid
flowchart TD
  inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
  login --> ok{"Autenticado?"}
  ok -- "Não" --> erro["Mensagem de erro"] --> login
  ok -- "Sim" --> painel["Painel da administração<br/>atividade recente"]
  painel --> tarefa{"O que fazer?"}

  tarefa -- "Usuários" --> usuario{"Usuário novo?"}
  usuario -- "Sim" --> criar["Cadastrar<br/>perfil, UBS e microárea"]
  usuario -- "Não" --> editar["Editar ou desativar<br/>desativado não entra mais"]
  tarefa -- "Parâmetros" --> param["Prazos do seguimento,<br/>tolerância da busca ativa<br/>e estoque mínimo"]
  param --> efeito(["Valem para as pendências e<br/>os alertas de todas as UBS"])
  tarefa -- "Unidades" --> unidades(["UBS e coordenadorias"])
  tarefa -- "Auditoria" --> aud(["Acessos e alterações<br/>de todos os usuários"])

  classDef perfil fill:#eceff1,stroke:#546e7a,color:#1f2b31
  class inicio,painel,efeito,unidades,aud perfil
```

---

## Versões horizontais

Os mesmos fluxos em formato paisagem: cada etapa vira uma faixa lida da esquerda para a direita, e as faixas
seguem de cima para baixo. As imagens são os arquivos `*-horizontal.png` em [`docs/fluxogramas/`](fluxogramas/);
o código de cada uma está abaixo, para editar.

<details>
<summary>ACS (horizontal): <code>fluxogramas/1-acs-horizontal.png</code></summary>

```mermaid
flowchart TB
  subgraph entrada["Entrada"]
    direction LR
    inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
    login --> ok{"Autenticado?"}
    ok -- "Não" --> erro["Mensagem de erro"] --> login
    ok -- "Sim" --> painel["Painel do ACS<br/>pendências da microárea"]
  end
  subgraph busca["Busca ativa da microárea"]
    direction LR
    lista["Pessoas com prazo<br/>vencido na UBS"] --> escolher["Escolher a pessoa<br/>o que precisa fazer,<br/>endereço, telefone"]
    escolher --> contato["Visitar, ligar ou<br/>mandar mensagem"]
    contato --> registrar["Registrar a tentativa"]
    registrar --> resultado{"Conseguiu<br/>falar com a pessoa?"}
    resultado -- "Não: não encontrada,<br/>endereço errado ou recusou" --> depois["Nova tentativa depois"] --> contato
    resultado -- "Sim: orientou<br/>ou agendou" --> volta["Pessoa volta à UBS"]
    volta --> fim(["UBS registra o atendimento<br/>e a tarefa sai da lista"])
  end
  entrada --> busca

  classDef perfil fill:#e8f4ec,stroke:#16a07a,color:#0b3d2e
  class inicio,painel,fim perfil
  style entrada fill:#f7f9fa,stroke:#16a07a
  style busca fill:#f7f9fa,stroke:#16a07a
```

</details>

<details>
<summary>Executor(a) de teste rápido (horizontal): <code>fluxogramas/2-executor-horizontal.png</code></summary>

```mermaid
flowchart TB
  subgraph entrada["Entrada"]
    direction LR
    inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
    login --> ok{"Autenticado?"}
    ok -- "Não" --> erro["Mensagem de erro"] --> login
    ok -- "Sim" --> painel["Painel da UBS<br/>pendências do dia e alertas"]
  end
  subgraph testagem["Atender uma pessoa: nova testagem"]
    direction LR
    p1["1. Pessoa<br/>buscar por nome, CNS ou CPF<br/>ou cadastrar se for nova"] --> p2["2. Contexto<br/>motivo, gestação,<br/>exposição recente"]
    p2 --> p3["3. Testes guiados pelo fluxograma<br/>HIV, sífilis, hepatites B e C<br/>HIV: TR1 reagente pede TR2"]
    p3 --> p4["4. Conduta<br/>interpretação e orientação"]
    p4 --> reagente{"Algum<br/>reagente?"}
    reagente -- "Não" --> fimNeg(["Testagem registrada"])
  end
  subgraph seguimento["Acompanhar casos: seguimento"]
    direction LR
    caso["Caso aberto no seguimento"] --> coleta["Registrar coleta do<br/>exame confirmatório"]
    coleta --> res{"Resultado do<br/>confirmatório"}
    res -- "Descartado" --> encerrado(["Caso encerrado"])
    res -- "Confirmado" --> trat["Tratamento<br/>sífilis: doses na UBS, VDRL de controle<br/>e tratamento das parcerias"]
    trat --> encerrado
    caso -. "prazo vencido" .-> busca["Busca ativa pelo ACS"]
    res -. "caso notificável" .-> notif["Notificação enviada<br/>pela responsável técnica"]
  end
  entrada -- "Atender uma pessoa" --> testagem
  testagem -- "Reagente: abre o caso<br/>ou Acompanhar casos" --> seguimento

  classDef outro fill:#fff,stroke:#9aa5ab,stroke-dasharray:4 3,color:#333
  class busca,notif outro

  classDef perfil fill:#e6f0f8,stroke:#1d5b7c,color:#102a3a
  class inicio,painel,fimNeg,encerrado perfil
  style entrada fill:#f7f9fa,stroke:#1d5b7c
  style testagem fill:#f7f9fa,stroke:#1d5b7c
  style seguimento fill:#f7f9fa,stroke:#1d5b7c
```

</details>

<details>
<summary>Responsável técnico(a) da UBS (horizontal): <code>fluxogramas/3-responsavel-tecnico-horizontal.png</code></summary>

```mermaid
flowchart TB
  subgraph entrada["Entrada"]
    direction LR
    inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
    login --> ok{"Autenticado?"}
    ok -- "Não" --> erro["Mensagem de erro"] --> login
    ok -- "Sim" --> painel["Painel da UBS<br/>pendências, estoque<br/>e notificações"]
  end
  subgraph rotina["Rotina da UBS"]
    direction LR
    atend["Atendimento<br/>testagem e seguimento<br/>como o executor"]
    busca["Busca ativa<br/>registrar tentativas de contato"]
    ind(["Indicadores<br/>positividade e cascata<br/>do cuidado da UBS"])
    aud(["Auditoria<br/>quem fez o quê e quando"])
    atend ~~~ busca ~~~ ind ~~~ aud
  end
  subgraph estoque["Estoque"]
    direction LR
    alerta{"Lote vencendo ou<br/>abaixo do mínimo?"} -- "Sim" --> repor["Usar primeiro o que vence antes<br/>e pedir reposição"]
    alerta -- "Não" --> lotes
    repor --> lotes["Entrada de lotes e baixas<br/>perda, vencimento, ajuste"]
    lotes --> sislog(["Fechamento mensal<br/>exportar para o SISLOGLAB"])
  end
  subgraph notificacoes["Notificações"]
    direction LR
    fila["Fila de notificações<br/>com prazo de cada uma"] --> ficha{"Ficha completa?"}
    ficha -- "Não" --> completar["Completar os dados<br/>escolaridade, raça/cor..."] --> ficha
    ficha -- "Sim" --> envio(["Enviar ao Sentinela<br/>ou à DVS"])
  end
  entrada --> rotina
  rotina --> estoque
  rotina --> notificacoes

  classDef perfil fill:#ede7f6,stroke:#6a4c9c,color:#2a1d40
  class inicio,painel,sislog,envio,ind,aud perfil
  style entrada fill:#f7f9fa,stroke:#6a4c9c
  style rotina fill:#f7f9fa,stroke:#6a4c9c
  style estoque fill:#f7f9fa,stroke:#6a4c9c
  style notificacoes fill:#f7f9fa,stroke:#6a4c9c
```

</details>

<details>
<summary>Gestão APS / Vigilância (horizontal): <code>fluxogramas/4-gestao-horizontal.png</code></summary>

```mermaid
flowchart TB
  subgraph entrada["Entrada"]
    direction LR
    inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
    login --> ok{"Autenticado?"}
    ok -- "Não" --> erro["Mensagem de erro"] --> login
    ok -- "Sim" --> painel["Painel da gestão<br/>tratamento iniciado<br/>por coordenadoria"]
  end
  subgraph indicadores["Indicadores da rede"]
    direction LR
    filtro["Filtrar período,<br/>coordenadoria e UBS"] --> posit["Positividade por agravo"]
    filtro --> cascata["Cascata do cuidado<br/>teste, confirmação,<br/>tratamento, notificação"]
    filtro --> comparar["Comparação entre UBS<br/>e coordenadorias"]
    posit & cascata & comparar --> abaixo{"Alguma UBS abaixo<br/>da meta de 80%?"}
    abaixo -- "Sim" --> acao(["Planejar apoio à UBS<br/>testagem ou seguimento"])
    abaixo -- "Não" --> acompanhar(["Seguir acompanhando"])
  end
  entrada --> indicadores

  classDef perfil fill:#fdf1e3,stroke:#d9691a,color:#4a2408
  class inicio,painel,acao,acompanhar perfil
  style entrada fill:#f7f9fa,stroke:#d9691a
  style indicadores fill:#f7f9fa,stroke:#d9691a
```

</details>

<details>
<summary>Administração do sistema (horizontal): <code>fluxogramas/5-administracao-horizontal.png</code></summary>

```mermaid
flowchart TB
  subgraph entrada["Entrada"]
    direction LR
    inicio(["Acessar o sistema"]) --> login["Login<br/>e-mail institucional e senha<br/>ou conta gov.br"]
    login --> ok{"Autenticado?"}
    ok -- "Não" --> erro["Mensagem de erro"] --> login
    ok -- "Sim" --> painel["Painel da administração<br/>atividade recente"]
  end
  subgraph usuarios["Usuários"]
    direction LR
    usuario{"Usuário novo?"} -- "Sim" --> criar["Cadastrar<br/>perfil, UBS e microárea"]
    usuario -- "Não" --> editar["Editar ou desativar<br/>desativado não entra mais"]
  end
  subgraph parametros["Parâmetros"]
    direction LR
    param["Prazos do seguimento,<br/>tolerância da busca ativa<br/>e estoque mínimo"] --> efeito(["Valem para as pendências e<br/>os alertas de todas as UBS"])
  end
  subgraph outros["Unidades e auditoria"]
    direction LR
    unidades(["UBS e coordenadorias"])
    aud(["Acessos e alterações<br/>de todos os usuários"])
  end
  entrada --> usuarios
  entrada --> parametros
  entrada --> outros

  classDef perfil fill:#eceff1,stroke:#546e7a,color:#1f2b31
  class inicio,painel,efeito,unidades,aud perfil
  style entrada fill:#f7f9fa,stroke:#546e7a
  style usuarios fill:#f7f9fa,stroke:#546e7a
  style parametros fill:#f7f9fa,stroke:#546e7a
  style outros fill:#f7f9fa,stroke:#546e7a
```

</details>
